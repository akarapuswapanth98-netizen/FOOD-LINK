/* FOODLINK AI — live backend mapper.
   Translates the FOODBRIDGE FastAPI MatchResponse into the normalized
   MatchWorkflow. Only reported values are used: allocations, distances,
   real per-stop ETAs from logistics batches, scores, event timestamps.
   Backend agents: coordinator/restaurant/shelter/matching/logistics/
   verification — coordinator (orchestration) maps onto the matching core;
   negotiation stays honestly idle on live runs. */

import type {
  AgentEvent,
  AgentKind,
  Allocation,
  EventStatus,
  LocationNode,
  MatchWorkflow,
  NetworkConnection,
  WorkflowStatus,
} from "./schemas";
import { co2AvoidedKg, portionWeightKg } from "../lib/impact";

export interface LiveLot {
  id: string;
  restaurant_id: string;
  meal_count: number;
  food_type: string;
  dietary_tags: string[];
  expires_at: string;
  status: string;
}

export interface LiveRestaurant {
  id: string;
  name: string;
  lat: number;
  lon: number;
  address: string;
  cuisine_types: string[];
}

export interface LiveShelter {
  id: string;
  name: string;
  lat: number;
  lon: number;
  capacity: number;
  current_occupancy: number;
  urgency: string;
  address: string;
}

interface LiveAllocation {
  shelter_id: string;
  shelter_name: string;
  meals: number;
  distance_km: number;
  score: number;
}

interface LiveEvent {
  workflow_id: string;
  agent: string;
  status: string;
  detail: string;
  timestamp: string;
}

export interface LiveMatchResponse {
  success: boolean;
  workflow_id: string;
  workflow_status: string;
  allocation: LiveAllocation[];
  agent_events: LiveEvent[];
  total_allocated: number;
  unallocated: number;
  summary: string;
  summary_source: string;
  retry_count: number;
  metadata: {
    duration_ms?: number;
    requested_radius_km?: number;
    logistics?: {
      batches?: Array<{ shelter_id: string; eta_minutes: number }>;
    };
  };
  error?: unknown;
}

export interface LiveMatchContext {
  lot: LiveLot;
  restaurant: LiveRestaurant;
  shelters: LiveShelter[];
}

const AGENT_MAP: Record<string, AgentKind> = {
  coordinator: "matching",
  restaurant: "restaurant",
  shelter: "shelter",
  matching: "matching",
  logistics: "logistics",
  verification: "verification",
};

const TOPOLOGY: Array<{ id: string; from: AgentKind; to: AgentKind }> = [
  { id: "c-rest-match", from: "restaurant", to: "matching" },
  { id: "c-match-neg", from: "matching", to: "negotiation" },
  { id: "c-neg-shel", from: "negotiation", to: "shelter" },
  { id: "c-match-log", from: "matching", to: "logistics" },
  { id: "c-log-shel", from: "logistics", to: "shelter" },
  { id: "c-match-shel", from: "matching", to: "shelter" },
  { id: "c-log-ver", from: "logistics", to: "verification" },
  { id: "c-shel-ver", from: "shelter", to: "verification" },
];

const CONFIRMED_EDGES = new Set(["c-rest-match", "c-match-log", "c-log-shel", "c-match-shel"]);

export function prettifyFoodType(ft: string): string {
  return ft
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function mapEventStatus(status: string, first: boolean): EventStatus {
  if (status === "completed") return "completed";
  if (status === "failed") return "failed";
  return first ? "started" : "progress";
}

function mapWorkflowStatus(s: string): WorkflowStatus {
  if (s === "completed") return "completed";
  if (s === "timeout") return "timed_out";
  return "failed";
}

export function mapLiveMatch(resp: LiveMatchResponse, ctx: LiveMatchContext): MatchWorkflow {
  const now = new Date().toISOString();
  const events: AgentEvent[] = (resp.agent_events ?? []).map((e, i) => ({
    id: `${resp.workflow_id.slice(0, 8)}-${i}`,
    workflowId: resp.workflow_id,
    agent: AGENT_MAP[e.agent] ?? "matching",
    type: i === 0 ? "workflow.started" : "live-update",
    status: mapEventStatus(e.status, i === 0),
    message: e.detail,
    timestamp: e.timestamp,
    metadata: { raw_agent: e.agent },
  }));

  const etaByShelter = new Map<string, number>();
  for (const b of resp.metadata?.logistics?.batches ?? []) {
    if (typeof b?.eta_minutes === "number") etaByShelter.set(b.shelter_id, Math.round(b.eta_minutes * 10) / 10);
  }

  const item = prettifyFoodType(ctx.lot.food_type || "meals");
  const allocations: Allocation[] = (resp.allocation ?? []).map((a, i) => ({
    id: `${resp.workflow_id.slice(0, 8)}-alloc-${i}`,
    item,
    quantity: a.meals,
    unit: "meals",
    destinationId: a.shelter_id,
    destinationName: a.shelter_name,
    distanceKm: a.distance_km,
    // Real per-stop ETA from the logistics plan; 0/absent renders as "—".
    etaMinutes: etaByShelter.get(a.shelter_id) ?? 0,
    confidence: typeof a.score === "number" && a.score >= 0 && a.score <= 1 ? Math.round(a.score * 100) / 100 : undefined,
    status: resp.workflow_status === "completed" ? "confirmed" : "pending",
  }));

  const source: LocationNode = {
    id: ctx.restaurant.id,
    name: ctx.restaurant.name,
    kind: "source",
    address: ctx.restaurant.address || undefined,
  };
  const allocatedIds = new Set(allocations.map((a) => a.destinationId));
  const destinations: LocationNode[] = ctx.shelters
    .filter((s) => allocatedIds.has(s.id))
    .map((s) => ({ id: s.id, name: s.name, kind: "destination", address: s.address || undefined }));

  const status = mapWorkflowStatus(resp.workflow_status);
  const counts = new Map<AgentKind, number>();
  for (const e of events) counts.set(e.agent, (counts.get(e.agent) ?? 0) + 1);
  const connections: NetworkConnection[] = TOPOLOGY.map((t) => {
    const f = counts.get(t.from) ?? 0;
    const tt = counts.get(t.to) ?? 0;
    let state: NetworkConnection["state"] = "idle";
    if (status === "completed") {
      state = CONFIRMED_EDGES.has(t.id) ? "confirmed" : f + tt > 0 ? "dimmed" : "idle";
    } else if (f + tt > 0) {
      state = "active";
    }
    return { ...t, state, eventCount: f + tt };
  });

  const scores = allocations
    .map((a) => a.confidence)
    .filter((c): c is number => typeof c === "number");
  const totalQty = allocations.reduce((s, a) => s + a.quantity, 0);
  const weightKg = portionWeightKg(totalQty);

  return {
    id: resp.workflow_id,
    status,
    createdAt: events[0]?.timestamp ?? now,
    updatedAt: events[events.length - 1]?.timestamp ?? now,
    source,
    destinations,
    allocations,
    agentEvents: events,
    connections,
    summary: {
      totalQuantity: resp.total_allocated,
      unit: "meals",
      allocationsCount: allocations.length,
      confirmedCount: status === "completed" ? allocations.length : 0,
      avgConfidence: scores.length ? Math.round((scores.reduce((s, c) => s + c, 0) / scores.length) * 100) / 100 : undefined,
      matchDurationMs: typeof resp.metadata?.duration_ms === "number" ? resp.metadata.duration_ms : 0,
      mealsRescued: resp.total_allocated,
      weightKg,
      // Estimate only — methodology disclosed in the Impact section.
      co2AvoidedKg: co2AvoidedKg(weightKg),
      // Verbatim backend verdict string.
      summaryText: resp.summary && resp.summary.length > 0 ? resp.summary : undefined,
    },
    error:
      status === "failed"
        ? {
            code: "LIVE_WORKFLOW_FAILED",
            message: resp.summary || "The live workflow reported failure.",
            detail: `Unallocated: ${resp.unallocated} meals. Retry count: ${resp.retry_count}.`,
          }
        : undefined,
  };
}

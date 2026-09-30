/* FOODLINK AI — explicit development adapter.
   All workflows produced here are DEMO data: simulated locally because no
   live backend is reachable. Every consumer must label this source as demo. */

import type {
  AgentEvent,
  AgentKind,
  Allocation,
  EventStatus,
  LocationNode,
  MatchRequest,
  MatchWorkflow,
  NetworkConnection,
  ScenarioKind,
  WorkflowStatus,
} from "./schemas";
import { co2AvoidedKg, portionWeightKg } from "../lib/impact";

export const DEMO_LABEL = "Demo data — simulated locally, no live backend connected.";

export interface Partner {
  id: string;
  name: string;
  address: string;
}

export const RESTAURANTS: Partner[] = [
  { id: "r-meghana", name: "Meghana Foods", address: "Koramangala 5th Block, Bengaluru" },
  { id: "r-truffles", name: "Truffles", address: "St. Marks Road, Bengaluru" },
  { id: "r-a2b", name: "Adyar Ananda Bhavan", address: "100 Ft Road, Indiranagar" },
  { id: "r-theobroma", name: "Theobroma", address: "27th Main, HSR Layout" },
  { id: "r-eatfit", name: "EatFit", address: "80 Ft Road, Koramangala" },
];

export const SHELTERS: Partner[] = [
  { id: "s-harbor", name: "Harbor Light Shelter", address: "Shivajinagar, Bengaluru" },
  { id: "s-northside", name: "Northside Community Kitchen", address: "Yeshwanthpur, Bengaluru" },
  { id: "s-stjude", name: "St. Jude's Pantry", address: "Jayanagar, Bengaluru" },
];

/* ---------- Live surplus board data (demo) ----------
   Zomato-style partner menus: cuisine, rating, rescue lots with live
   expiry countdowns. All demo data — replaced by the live catalog API. */

export type FoodArtKind = "thali" | "biryani" | "burger" | "bread" | "bowl" | "pastry";

export interface SurplusLot {
  id: string;
  item: string;
  quantity: number;
  unit: string;
  veg: boolean;
  /** minutes from page load until the lot expires (demo countdown basis) */
  expiresInMin: number;
  art: FoodArtKind;
}

export interface SurplusPartner extends Partner {
  cuisines: string[];
  rating: number;
  distanceKm: number;
  offer?: string;
  lots: SurplusLot[];
}

export const SURPLUS_PARTNERS: SurplusPartner[] = [
  {
    id: "r-meghana",
    name: "Meghana Foods",
    address: "Koramangala 5th Block, Bengaluru",
    cuisines: ["Andhra", "Biryani", "Kebabs"],
    rating: 4.4,
    distanceKm: 1.2,
    offer: "Rescue pricing · 50% value unlocked",
    lots: [
      { id: "lot-mg-chicken", item: "Chicken Dum Biryani", quantity: 32, unit: "meals", veg: false, expiresInMin: 118, art: "biryani" },
      { id: "lot-mg-veg", item: "Veg Biryani", quantity: 20, unit: "meals", veg: true, expiresInMin: 150, art: "biryani" },
    ],
  },
  {
    id: "r-truffles",
    name: "Truffles",
    address: "St. Marks Road, Bengaluru",
    cuisines: ["Burgers", "American", "Steaks"],
    rating: 4.5,
    distanceKm: 2.8,
    offer: "Tonight only · grill surplus",
    lots: [
      { id: "lot-tr-paneer", item: "Crispy Paneer Burgers", quantity: 25, unit: "pcs", veg: true, expiresInMin: 88, art: "burger" },
    ],
  },
  {
    id: "r-a2b",
    name: "Adyar Ananda Bhavan",
    address: "100 Ft Road, Indiranagar",
    cuisines: ["South Indian", "Meals", "Tiffin"],
    rating: 4.3,
    distanceKm: 3.6,
    offer: "Closing batch · grab fast",
    lots: [
      { id: "lot-a2b-meals", item: "South Mini Meals", quantity: 48, unit: "meals", veg: true, expiresInMin: 165, art: "thali" },
    ],
  },
  {
    id: "r-theobroma",
    name: "Theobroma",
    address: "27th Main, HSR Layout",
    cuisines: ["Bakery", "Desserts", "Breads"],
    rating: 4.6,
    distanceKm: 4.4,
    offer: "Fresh from the oven · surplus",
    lots: [
      { id: "lot-th-croissant", item: "Butter Croissants", quantity: 40, unit: "pcs", veg: true, expiresInMin: 152, art: "pastry" },
      { id: "lot-th-sourdough", item: "Sourdough Loaves", quantity: 24, unit: "loaves", veg: true, expiresInMin: 320, art: "bread" },
    ],
  },
  {
    id: "r-eatfit",
    name: "EatFit",
    address: "80 Ft Road, Koramangala",
    cuisines: ["Healthy", "Bowls", "Protein"],
    rating: 4.2,
    distanceKm: 1.8,
    offer: "Eat light · rescue right",
    lots: [
      { id: "lot-ef-bowl", item: "Buddha Bowls", quantity: 36, unit: "meals", veg: true, expiresInMin: 205, art: "bowl" },
    ],
  },
];

/** City-map anchor points. x/y drive the offline SVG; lat/lng drive the live tile map. */
export const MAP_POINTS: Record<string, { x: number; y: number; label: string; lat: number; lng: number }> = {
  "r-meghana": { x: 470, y: 250, label: "Koramangala", lat: 12.9352, lng: 77.6245 },
  "r-truffles": { x: 330, y: 150, label: "St. Marks Rd", lat: 12.9746, lng: 77.6013 },
  "r-a2b": { x: 520, y: 130, label: "Indiranagar", lat: 12.9784, lng: 77.6408 },
  "r-theobroma": { x: 450, y: 312, label: "HSR Layout", lat: 12.9116, lng: 77.6474 },
  "r-eatfit": { x: 495, y: 232, label: "Koramangala", lat: 12.935, lng: 77.627 },
  "s-harbor": { x: 350, y: 108, label: "Shivajinagar", lat: 12.985, lng: 77.606 },
  "s-northside": { x: 170, y: 88, label: "Yeshwanthpur", lat: 13.028, lng: 77.54 },
  "s-stjude": { x: 380, y: 282, label: "Jayanagar", lat: 12.925, lng: 77.593 },
};

let seq = 0;
const nid = (p: string): string => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const BASE_CONNECTIONS: Array<{ id: string; from: AgentKind; to: AgentKind }> = [
  { id: "c-rest-match", from: "restaurant", to: "matching" },
  { id: "c-match-neg", from: "matching", to: "negotiation" },
  { id: "c-neg-shel", from: "negotiation", to: "shelter" },
  { id: "c-match-log", from: "matching", to: "logistics" },
  { id: "c-log-shel", from: "logistics", to: "shelter" },
  { id: "c-match-shel", from: "matching", to: "shelter" },
  { id: "c-log-ver", from: "logistics", to: "verification" },
  { id: "c-shel-ver", from: "shelter", to: "verification" },
];

interface ScriptStep {
  agent: AgentKind;
  type: string;
  status: EventStatus;
  message: string;
  delayMs: number;
  metadata?: Record<string, unknown>;
}

function scriptFor(scenario: ScenarioKind, items: string): ScriptStep[] {
  const common: ScriptStep[] = [
    {
      agent: "restaurant", type: "surplus.detected", status: "completed",
      message: `Surplus detected: ${items}. Availability window published.`,
      delayMs: 700, metadata: { channel: "pos-feed" },
    },
    {
      agent: "matching", type: "match.search_started", status: "started",
      message: "Scanning compatible demand across shelter partners.", delayMs: 900,
    },
    {
      agent: "shelter", type: "demand.confirmed", status: "completed",
      message: "Harbor Light Shelter confirmed capacity for this evening intake.",
      delayMs: 1100, metadata: { capacity_meals: 220 },
    },
    {
      agent: "matching", type: "match.candidates_ranked", status: "progress",
      message: "Ranked 3 candidate destinations by distance, need, and expiry fit.",
      delayMs: 1000, metadata: { candidates: 3 },
    },
    {
      agent: "negotiation", type: "negotiation.proposal", status: "started",
      message: "Proposed split allocation across two destinations.", delayMs: 900,
      metadata: { rounds: 1 },
    },
    {
      agent: "shelter", type: "negotiation.counter", status: "progress",
      message: "Northside requested a later pickup to align with volunteer shifts.",
      delayMs: 1200, metadata: { shift_minutes: 30 },
    },
  ];
  if (scenario === "failed") {
    return [
      ...common,
      {
        agent: "negotiation", type: "negotiation.failed", status: "failed",
        message: "Negotiation broke down: pickup windows no longer overlap after counter-offer.",
        delayMs: 1000, metadata: { reason: "window-mismatch" },
      },
      {
        agent: "logistics", type: "route.aborted", status: "failed",
        message: "Route planning aborted — no agreed allocation to dispatch.", delayMs: 800,
      },
    ];
  }
  if (scenario === "empty") {
    return [
      ...common.slice(0, 4),
      {
        agent: "matching", type: "match.no_candidates", status: "completed",
        message: "No compatible destination within distance and pickup constraints.",
        delayMs: 900, metadata: { candidates: 0 },
      },
    ];
  }
  const tail: ScriptStep[] = [
    {
      agent: "negotiation", type: "negotiation.agreed", status: "completed",
      message: "Allocation agreed: quantities, pickup time, and handoff contact locked.",
      delayMs: 1000, metadata: { rounds: 2, confidence: 0.91 },
    },
    {
      agent: "logistics", type: "route.planned", status: "completed",
      message: "Route planned: pickup, transit, and handoff stages sequenced.",
      delayMs: 1100, metadata: { distance_km: 6.4, eta_minutes: 38 },
    },
    {
      agent: "logistics", type: "dispatch.confirmed", status: "progress",
      message: "Courier Asha (Unit-7) accepted the run. Pickup window confirmed with source.",
      delayMs: scenario === "partial" ? 1400 : 900,
      metadata: scenario === "partial" ? { delay_minutes: 25 } : { courier: "Asha · Unit-7" },
    },
  ];
  if (scenario === "partial") {
    return [
      ...tail.slice(0, 2),
      {
        agent: "logistics", type: "dispatch.delayed", status: "warning",
        message: "Second-leg courier delayed by traffic; one allocation still pending.",
        delayMs: 1300, metadata: { delay_minutes: 25 },
      },
      {
        agent: "verification", type: "handoff.partial", status: "warning",
        message: "First handoff verified. Second handoff pending courier arrival.",
        delayMs: 900,
      },
    ];
  }
  return [
    ...tail,
    {
      agent: "logistics", type: "delivery.completed", status: "completed",
      message: "Delivery completed at both destinations. Proof of receipt captured.",
      delayMs: 1100,
    },
    {
      agent: "verification", type: "handoff.verified", status: "completed",
      message: "Handoff verified: quantities, timestamps, and impact recorded.",
      delayMs: 800, metadata: { proof: "receipt-signed" },
    },
  ];
}

function allocationsFor(
  scenario: ScenarioKind,
  req: MatchRequest,
  workflowId: string,
): { allocations: Allocation[]; destinations: LocationNode[] } {
  if (scenario === "empty" || scenario === "failed") {
    return { allocations: [], destinations: [] };
  }
  const first = req.surplus_items[0];
  const itemName = first ? first.item : "surplus meals";
  const unit = first ? first.unit : "meals";
  const total = first ? first.quantity : 0;
  const split = Math.ceil(total * 0.6);
  const rest = total - split;
  const destinations: LocationNode[] = [
    { id: SHELTERS[0].id, name: SHELTERS[0].name, kind: "destination", address: SHELTERS[0].address },
    { id: SHELTERS[1].id, name: SHELTERS[1].name, kind: "destination", address: SHELTERS[1].address },
  ];
  const secondStatus = scenario === "partial" ? "pending" : "confirmed";
  const allocations: Allocation[] = [
    {
      id: nid("alloc"), item: itemName, quantity: split, unit,
      destinationId: destinations[0].id, destinationName: destinations[0].name,
      distanceKm: 2.8, etaMinutes: 24, confidence: 0.92, status: "confirmed",
    },
  ];
  if (rest > 0) {
    allocations.push({
      id: nid("alloc"), item: itemName, quantity: rest, unit,
      destinationId: destinations[1].id, destinationName: destinations[1].name,
      distanceKm: 5.1, etaMinutes: 41, confidence: 0.87, status: secondStatus,
    });
  }
  void workflowId;
  return { allocations, destinations };
}

function finalStatus(scenario: ScenarioKind): WorkflowStatus {
  switch (scenario) {
    case "success":
      return "completed";
    case "partial":
      return "partial";
    case "empty":
      return "empty";
    case "failed":
      return "failed";
  }
}

function connectionState(
  scenario: ScenarioKind,
  done: boolean,
  id: string,
  activeAgents: Set<AgentKind>,
  conn: { from: AgentKind; to: AgentKind },
): NetworkConnection["state"] {
  if (scenario === "failed" && done && (id === "c-match-neg" || id === "c-neg-shel")) return "severed";
  if (done && (finalStatus(scenario) === "completed" || finalStatus(scenario) === "partial")) {
    if (["c-rest-match", "c-match-log", "c-log-shel", "c-match-shel"].includes(id)) return "confirmed";
    return "dimmed";
  }
  if (done && finalStatus(scenario) === "empty") return "dimmed";
  if (activeAgents.has(conn.from) && activeAgents.has(conn.to)) return "active";
  if (activeAgents.has(conn.from) || activeAgents.has(conn.to)) return "active";
  return "idle";
}

/** Synchronous dry-run preview: allocations only, no events, clearly labeled. */
export function previewMockMatch(req: MatchRequest): {
  allocations: Allocation[];
  destinations: LocationNode[];
} {
  return allocationsFor(req.scenario ?? "success", req, "dry-run");
}

/**
 * Stream a demo workflow to onUpdate with realistic pacing.
 * Uses compressed real gaps between scripted steps (400–2500ms).
 */
export async function streamMockMatch(
  req: MatchRequest,
  onUpdate: (wf: MatchWorkflow) => void,
): Promise<MatchWorkflow> {
  const scenario = req.scenario ?? "success";
  const workflowId = nid("wf");
  const createdAt = new Date().toISOString();
  const restaurant = RESTAURANTS.find((r) => r.id === req.restaurant_id) ?? RESTAURANTS[0];
  const itemsLabel = req.surplus_items.map((i) => `${i.quantity} ${i.unit} ${i.item}`).join(", ");
  const steps = scriptFor(scenario, itemsLabel || "surplus food");

  const idle: NetworkConnection[] = BASE_CONNECTIONS.map((c) => ({
    ...c,
    state: "idle" as const,
    eventCount: 0,
  }));

  let wf: MatchWorkflow = {
    id: workflowId,
    status: "queued",
    createdAt,
    updatedAt: createdAt,
    source: { id: restaurant.id, name: restaurant.name, kind: "source", address: restaurant.address },
    destinations: [],
    allocations: [],
    agentEvents: [],
    connections: idle,
  };
  onUpdate({ ...wf });
  await sleep(650);

  wf = { ...wf, status: "running", updatedAt: new Date().toISOString() };
  onUpdate({ ...wf });

  const active = new Set<AgentKind>();
  for (const step of steps) {
    await sleep(Math.min(2500, Math.max(400, step.delayMs)));
    const evt: AgentEvent = {
      id: nid("evt"),
      workflowId,
      agent: step.agent,
      type: step.type,
      status: step.status,
      message: step.message,
      timestamp: new Date().toISOString(),
      metadata: step.metadata,
    };
    active.add(step.agent);
    const events = [...wf.agentEvents, evt];
    const counts = new Map<string, number>();
    for (const e of events) {
      counts.set(`${e.agent}`, (counts.get(`${e.agent}`) ?? 0) + 1);
    }
    const connections: NetworkConnection[] = BASE_CONNECTIONS.map((c) => ({
      ...c,
      state: connectionState(scenario, false, c.id, active, c),
      eventCount:
        (counts.get(c.from) ?? 0) + (counts.get(c.to) ?? 0) > 0
          ? (counts.get(c.from) ?? 0) + (counts.get(c.to) ?? 0)
          : 0,
    }));
    wf = { ...wf, agentEvents: events, connections, updatedAt: evt.timestamp };
    onUpdate({ ...wf, agentEvents: [...events], connections: [...connections] });
  }

  await sleep(500);
  const status = finalStatus(scenario);
  const { allocations, destinations } = allocationsFor(scenario, req, workflowId);
  const startedAt = Date.parse(createdAt);
  const durationMs = Math.max(1, Date.now() - startedAt);
  const totalQty = allocations.reduce((s, a) => s + a.quantity, 0);
  const confidences = allocations
    .map((a) => a.confidence)
    .filter((c): c is number => typeof c === "number");
  const confirmed = allocations.filter((a) => a.status === "confirmed").length;
  const weightKg = portionWeightKg(totalQty);
  const finished: MatchWorkflow = {
    ...wf,
    status,
    destinations,
    allocations,
    updatedAt: new Date().toISOString(),
    connections: BASE_CONNECTIONS.map((c) => ({
      ...c,
      state: connectionState(scenario, true, c.id, active, c),
      eventCount: wf.agentEvents.filter((e) => e.agent === c.from || e.agent === c.to).length,
    })),
    summary:
      status === "completed" || status === "partial"
        ? {
            totalQuantity: totalQty,
            unit: allocations[0]?.unit ?? "units",
            allocationsCount: allocations.length,
            confirmedCount: confirmed,
            avgConfidence: confidences.length
              ? Math.round((confidences.reduce((s, c) => s + c, 0) / confidences.length) * 100) / 100
              : undefined,
            matchDurationMs: durationMs,
            mealsRescued: totalQty,
            weightKg,
            // Estimate only — methodology disclosed in the Impact section.
            co2AvoidedKg: co2AvoidedKg(weightKg),
          }
        : undefined,
    error:
      status === "failed"
        ? {
            code: "NEGOTIATION_BREAKDOWN",
            message: "Match failed during negotiation.",
            detail: "Pickup windows stopped overlapping after the counter-offer. Adjust the pickup window or distance and retry.",
          }
        : undefined,
  };
  onUpdate({ ...finished });
  return finished;
}

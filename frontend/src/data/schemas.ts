/* FOODLINK AI — data contracts, normalization, validation.
   Single boundary: every API payload passes through normalizeWorkflow()
   before reaching scene or presentation components. */

export type AgentKind =
  | "restaurant"
  | "matching"
  | "shelter"
  | "negotiation"
  | "logistics"
  | "verification";

export type AgentStatus =
  | "idle"
  | "listening"
  | "processing"
  | "waiting"
  | "completed"
  | "warning"
  | "failed";

export type WorkflowStatus =
  | "queued"
  | "running"
  | "completed"
  | "partial"
  | "failed"
  | "timed_out"
  | "empty";

export type EventStatus = "started" | "progress" | "completed" | "warning" | "failed";

export type ConnectionState = "idle" | "active" | "confirmed" | "dimmed" | "severed";

export type ScenarioKind = "success" | "partial" | "empty" | "failed";

export interface SurplusItem {
  item: string;
  quantity: number;
  unit: string;
  expires_at: string;
}

export interface MatchRequest {
  restaurant_id: string;
  surplus_items: SurplusItem[];
  constraints: {
    max_distance_km: number;
    pickup_window_start: string;
    pickup_window_end: string;
  };
  scenario?: ScenarioKind;
  dry_run?: boolean;
  /** Live-backend lot id. When present, the match runs against that lot. */
  surplus_id?: string;
}

export interface LocationNode {
  id: string;
  name: string;
  kind: "source" | "destination" | "hub";
  address?: string;
}

export interface Allocation {
  id: string;
  item: string;
  quantity: number;
  unit: string;
  destinationId: string;
  destinationName: string;
  distanceKm: number;
  etaMinutes: number;
  confidence?: number;
  status: "confirmed" | "pending" | "unresolved" | "failed";
}

export interface AgentEvent {
  id: string;
  workflowId: string;
  agent: AgentKind;
  type: string;
  status: EventStatus;
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface NetworkConnection {
  id: string;
  from: AgentKind;
  to: AgentKind;
  state: ConnectionState;
  eventCount: number;
}

export interface WorkflowSummary {
  totalQuantity: number;
  unit: string;
  allocationsCount: number;
  confirmedCount: number;
  avgConfidence?: number;
  matchDurationMs: number;
  mealsRescued: number;
  weightKg: number;
  co2AvoidedKg: number;
  /** Verbatim backend summary string when the response carries one. */
  summaryText?: string;
}

export interface WorkflowError {
  code: string;
  message: string;
  detail?: string;
}

export interface MatchWorkflow {
  id: string;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
  source?: LocationNode;
  destinations: LocationNode[];
  allocations: Allocation[];
  agentEvents: AgentEvent[];
  connections: NetworkConnection[];
  summary?: WorkflowSummary;
  error?: WorkflowError;
}

export const AGENT_ORDER: AgentKind[] = [
  "restaurant",
  "matching",
  "shelter",
  "negotiation",
  "logistics",
  "verification",
];

/** HTTP-mapped application error. Never thrown with invented workflow data. */
export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

const WORKFLOW_STATUSES: WorkflowStatus[] = [
  "queued",
  "running",
  "completed",
  "partial",
  "failed",
  "timed_out",
  "empty",
];

const EVENT_STATUSES: EventStatus[] = ["started", "progress", "completed", "warning", "failed"];

const CONN_STATES: ConnectionState[] = ["idle", "active", "confirmed", "dimmed", "severed"];

/**
 * Normalize an unknown API payload into a MatchWorkflow.
 * Missing optional fields are handled safely; unknown shapes throw ApiError.
 */
export function normalizeWorkflow(raw: unknown): MatchWorkflow {
  if (!isRecord(raw)) throw new ApiError("UNKNOWN_SHAPE", "Response was not a workflow object.");
  const statusRaw = str(raw["status"], "failed");
  const status: WorkflowStatus = WORKFLOW_STATUSES.includes(statusRaw as WorkflowStatus)
    ? (statusRaw as WorkflowStatus)
    : "failed";
  const eventsRaw = Array.isArray(raw["agentEvents"]) ? raw["agentEvents"] : raw["agent_events"];
  const events: AgentEvent[] = Array.isArray(eventsRaw)
    ? eventsRaw.filter(isRecord).map((e, i) => {
        const agentRaw = str(e["agent"], "matching");
        const agent: AgentKind = AGENT_ORDER.includes(agentRaw as AgentKind)
          ? (agentRaw as AgentKind)
          : "matching";
        const stRaw = str(e["status"], "progress");
        return {
          id: str(e["id"], `evt-${i}`),
          workflowId: str(e["workflowId"], str(e["workflow_id"], str(raw["id"], "wf-unknown"))),
          agent,
          type: str(e["type"], "update"),
          status: EVENT_STATUSES.includes(stRaw as EventStatus)
            ? (stRaw as EventStatus)
            : "progress",
          message: str(e["message"], "Agent update."),
          timestamp: str(e["timestamp"], new Date().toISOString()),
          metadata: isRecord(e["metadata"])
            ? (e["metadata"] as Record<string, unknown>)
            : undefined,
        };
      })
    : [];

  const allocsRaw = Array.isArray(raw["allocations"]) ? raw["allocations"] : [];
  const allocations: Allocation[] = allocsRaw.filter(isRecord).map((a, i) => ({
    id: str(a["id"], `alloc-${i}`),
    item: str(a["item"], "surplus food"),
    quantity: num(a["quantity"], 0),
    unit: str(a["unit"], "units"),
    destinationId: str(a["destinationId"], str(a["destination_id"], "")),
    destinationName: str(a["destinationName"], str(a["destination_name"], "Unknown destination")),
    distanceKm: num(a["distanceKm"], num(a["distance_km"], 0)),
    etaMinutes: num(a["etaMinutes"], num(a["eta_minutes"], 0)),
    confidence:
      typeof a["confidence"] === "number" && Number.isFinite(a["confidence"])
        ? (a["confidence"] as number)
        : undefined,
    status: ["confirmed", "pending", "unresolved", "failed"].includes(str(a["status"], ""))
      ? (str(a["status"]) as Allocation["status"])
      : "pending",
  }));

  const destsRaw = Array.isArray(raw["destinations"]) ? raw["destinations"] : [];
  const destinations: LocationNode[] = destsRaw.filter(isRecord).map((d, i) => ({
    id: str(d["id"], `dest-${i}`),
    name: str(d["name"], "Unknown destination"),
    kind: d["kind"] === "source" || d["kind"] === "hub" ? d["kind"] : "destination",
    address: typeof d["address"] === "string" ? (d["address"] as string) : undefined,
  }));

  const connsRaw = Array.isArray(raw["connections"]) ? raw["connections"] : [];
  const connections: NetworkConnection[] = connsRaw.filter(isRecord).map((c, i) => {
    const fromRaw = str(c["from"], "matching");
    const toRaw = str(c["to"], "shelter");
    const stateRaw = str(c["state"], "idle");
    return {
      id: str(c["id"], `conn-${i}`),
      from: AGENT_ORDER.includes(fromRaw as AgentKind) ? (fromRaw as AgentKind) : "matching",
      to: AGENT_ORDER.includes(toRaw as AgentKind) ? (toRaw as AgentKind) : "shelter",
      state: CONN_STATES.includes(stateRaw as ConnectionState)
        ? (stateRaw as ConnectionState)
        : "idle",
      eventCount: num(c["eventCount"], num(c["event_count"], 0)),
    };
  });

  const src = isRecord(raw["source"])
    ? {
        id: str(raw["source"]["id"], "src-unknown"),
        name: str(raw["source"]["name"], "Unknown source"),
        kind: "source" as const,
        address:
          typeof raw["source"]["address"] === "string"
            ? (raw["source"]["address"] as string)
            : undefined,
      }
    : undefined;

  const sumRaw = isRecord(raw["summary"]) ? raw["summary"] : undefined;
  const summary: WorkflowSummary | undefined = sumRaw
    ? {
        totalQuantity: num(sumRaw["totalQuantity"], num(sumRaw["total_quantity"], 0)),
        unit: str(sumRaw["unit"], "units"),
        allocationsCount: num(sumRaw["allocationsCount"], allocations.length),
        confirmedCount: num(
          sumRaw["confirmedCount"],
          allocations.filter((a) => a.status === "confirmed").length,
        ),
        avgConfidence:
          typeof sumRaw["avgConfidence"] === "number"
            ? (sumRaw["avgConfidence"] as number)
            : typeof sumRaw["avg_confidence"] === "number"
              ? (sumRaw["avg_confidence"] as number)
              : undefined,
        matchDurationMs: num(sumRaw["matchDurationMs"], num(sumRaw["match_duration_ms"], 0)),
        mealsRescued: num(sumRaw["mealsRescued"], num(sumRaw["meals_rescued"], 0)),
        weightKg: num(sumRaw["weightKg"], num(sumRaw["weight_kg"], 0)),
        co2AvoidedKg: num(sumRaw["co2AvoidedKg"], num(sumRaw["co2_avoided_kg"], 0)),
        summaryText:
          typeof sumRaw["summaryText"] === "string" && (sumRaw["summaryText"] as string).length > 0
            ? (sumRaw["summaryText"] as string)
            : undefined,
      }
    : undefined;

  const errRaw = isRecord(raw["error"]) ? raw["error"] : undefined;
  const error: WorkflowError | undefined = errRaw
    ? {
        code: str(errRaw["code"], "UNKNOWN"),
        message: str(errRaw["message"], "Workflow failed."),
        detail: typeof errRaw["detail"] === "string" ? (errRaw["detail"] as string) : undefined,
      }
    : undefined;

  return {
    id: str(raw["id"], `wf-${Date.now().toString(36)}`),
    status,
    createdAt: str(raw["createdAt"], str(raw["created_at"], new Date().toISOString())),
    updatedAt: str(raw["updatedAt"], str(raw["updated_at"], new Date().toISOString())),
    source: src,
    destinations,
    allocations,
    agentEvents: events,
    connections,
    summary,
    error,
  };
}

/** Client-side request validation — maps to a 422-style ApiError, never silent. */
export function validateMatchRequest(req: MatchRequest): void {
  if (!req.restaurant_id.trim()) {
    throw new ApiError("VALIDATION", "Select a restaurant partner before running a match.", 422);
  }
  // Direct lot rescue (live backend) may carry items for display/offered
  // tracking, but the lot itself is authoritative — skip item checks there.
  if (req.surplus_id) return;
  if (req.surplus_items.length === 0) {
    throw new ApiError("VALIDATION", "Add at least one surplus item.", 422);
  }
  for (const it of req.surplus_items) {
    if (!it.item.trim() || !(it.quantity > 0)) {
      throw new ApiError(
        "VALIDATION",
        "Each surplus item needs a name and a quantity greater than zero.",
        422,
      );
    }
  }
  if (!(req.constraints.max_distance_km > 0)) {
    throw new ApiError("VALIDATION", "Maximum distance must be greater than zero.", 422);
  }
  const start = Date.parse(req.constraints.pickup_window_start);
  const end = Date.parse(req.constraints.pickup_window_end);
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    throw new ApiError("VALIDATION", "Pickup window end must be after pickup window start.", 422);
  }
}

/** Map an agent event status onto the display agent status. */
export function eventStatusToAgent(status: EventStatus): AgentStatus {
  switch (status) {
    case "started":
      return "listening";
    case "progress":
      return "processing";
    case "completed":
      return "completed";
    case "warning":
      return "warning";
    case "failed":
      return "failed";
  }
}

/** Human-readable label for workflow status (never color alone). */
export function statusLabel(status: WorkflowStatus): string {
  switch (status) {
    case "queued":
      return "Queued";
    case "running":
      return "Running";
    case "completed":
      return "Completed";
    case "partial":
      return "Partial — needs attention";
    case "failed":
      return "Failed";
    case "timed_out":
      return "Timed out";
    case "empty":
      return "No match found";
  }
}

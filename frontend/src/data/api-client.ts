/* FOODLINK AI — replaceable API client for the real-time (realtime) rescue network.
   Specialized agents negotiate and hand off tasks autonomously behind these
   calls; the client only transports tasks and renders reported outcomes.
   Two explicit modes, never mixed silently:
   - LIVE (VITE_API_URL set): real FOODBRIDGE FastAPI. Every failure —
     404/409/422/429/500/offline — surfaces as a real error state.
   - DEMO (unset): the labeled local adapter streams a simulated workflow.
   Base URL comes only from env config, never hard-coded in components. */

import { ApiError, validateMatchRequest } from "./schemas";
import type { MatchRequest, MatchWorkflow } from "./schemas";
import { streamMockMatch } from "./mock-adapter";
import { mapLiveMatch, prettifyFoodType } from "./live-mapper";
import type {
  LiveLot,
  LiveMatchResponse,
  LiveRestaurant,
  LiveShelter,
} from "./live-mapper";

export const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");
export const LIVE_MODE = API_BASE.length > 0;
const FB = "/api/foodbridge";

export type DataSource = "live" | "demo";

export interface MatchResult {
  workflow: MatchWorkflow;
  source: DataSource;
}

export interface LiveCatalog {
  restaurants: LiveRestaurant[];
  shelters: LiveShelter[];
  lots: LiveLot[];
}

function slugifyFoodType(item: string): string {
  const s = item
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return s || "cooked_meals";
}

async function liveFetch(
  path: string,
  init?: RequestInit,
  timeoutMs = 15000,
): Promise<{ status: number; body: unknown }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    });
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { status: res.status, body };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("TIMEOUT", "The live backend took too long to respond. Retry shortly.");
    }
    throw new ApiError(
      "OFFLINE",
      "Can't reach the live server. Start the backend (uvicorn app.main:app --port 8000) and retry.",
    );
  } finally {
    clearTimeout(timer);
  }
}

function serverMessage(body: unknown): { code?: string; message?: string; detail?: string } {
  if (typeof body !== "object" || body === null) return {};
  const b = body as Record<string, unknown>;
  // 409 shape: { success:false, error:{ code, message, surplus_id } }
  if (typeof b["error"] === "object" && b["error"] !== null) {
    const e = b["error"] as Record<string, unknown>;
    return {
      code: typeof e["code"] === "string" ? e["code"] : undefined,
      message: typeof e["message"] === "string" ? e["message"] : undefined,
    };
  }
  // AppError shape: { error, detail } | FastAPI validation: { detail:[...] }
  const detailRaw = b["detail"];
  const detail = Array.isArray(detailRaw)
    ? [detailRaw[0]]
        .map((d) =>
          typeof d === "object" && d !== null && "msg" in d ? String((d as Record<string, unknown>)["msg"]) : null,
        )
        .filter(Boolean)
        .join("; ") || undefined
    : typeof detailRaw === "string"
      ? detailRaw
      : undefined;
  return {
    message: typeof b["error"] === "string" ? b["error"] : undefined,
    detail,
  };
}

function throwLiveError(status: number, body: unknown, fallback: string): never {
  const s = serverMessage(body);
  if (status === 409) {
    throw new ApiError(s.code ?? "CONFLICT", s.message ?? fallback, 409);
  }
  if (status === 404) {
    throw new ApiError("HTTP_404", s.message ?? "Resource not found (404).", 404);
  }
  if (status === 422) {
    throw new ApiError("HTTP_422", s.detail ?? s.message ?? "Invalid request (422).", 422);
  }
  if (status === 429) {
    throw new ApiError("HTTP_429", "Rate limited (429). Wait a moment, then retry.", 429);
  }
  if (status >= 500) {
    throw new ApiError(`HTTP_${status}`, s.message ?? "Service failure. Retry shortly.", status);
  }
  throw new ApiError(`HTTP_${status}`, s.message ?? fallback, status);
}

/** Live catalog for form selects and the surplus board. */
export async function fetchLiveCatalog(): Promise<LiveCatalog> {
  const [r, s, l] = await Promise.all([
    liveFetch(`${FB}/restaurants`),
    liveFetch(`${FB}/shelters`),
    liveFetch(`${FB}/surplus`),
  ]);
  if (r.status !== 200) throwLiveError(r.status, r.body, "Could not load restaurants.");
  if (s.status !== 200) throwLiveError(s.status, s.body, "Could not load shelters.");
  if (l.status !== 200) throwLiveError(l.status, l.body, "Could not load surplus lots.");
  const rb = r.body as { restaurants?: LiveRestaurant[] };
  const sb = s.body as { shelters?: LiveShelter[] };
  const lb = l.body as { surplus?: LiveLot[] };
  return {
    restaurants: rb.restaurants ?? [],
    shelters: sb.shelters ?? [],
    lots: lb.surplus ?? [],
  };
}

/** Demo-reset: restores seed lots (dev/rehearsal convenience, live only). */
export async function resetLiveDemo(): Promise<void> {
  const { status, body } = await liveFetch(`${FB}/demo/reset`, { method: "POST" });
  if (status !== 200) throwLiveError(status, body, "Demo reset failed.");
}

function clampHours(startIso: string, endIso: string): number {
  const ms = Date.parse(endIso) - Date.parse(startIso);
  if (!Number.isFinite(ms) || ms <= 0) return 5;
  return Math.min(168, Math.max(0.5, ms / 3600000));
}

/** Run a match. Live mode resolves/creates a lot, then maps the real response. */
export async function postMatch(
  req: MatchRequest,
  onUpdate: (wf: MatchWorkflow) => void,
  opts?: { forceMock?: boolean },
): Promise<MatchResult> {
  validateMatchRequest(req);
  if (opts?.forceMock || !LIVE_MODE) {
    const workflow = await streamMockMatch(req, onUpdate);
    return { workflow, source: "demo" };
  }

  // 1 · resolve the surplus lot: direct rescue, or create one from the form.
  let surplusId = req.surplus_id;
  let lot: LiveLot | null = null;
  let restaurant: LiveRestaurant | null = null;
  let shelters: LiveShelter[] = [];
  {
    const { status, body } = await liveFetch(`${FB}/restaurants`);
    if (status !== 200) throwLiveError(status, body, "Could not load restaurants.");
    const list = (body as { restaurants?: LiveRestaurant[] }).restaurants ?? [];
    restaurant = list.find((x) => x.id === req.restaurant_id) ?? null;
    if (!restaurant) {
      throw new ApiError(
        "HTTP_404",
        `Restaurant "${req.restaurant_id}" is not registered on the live backend. Pick one from the live list.`,
        404,
      );
    }
  }
  {
    const { status, body } = await liveFetch(`${FB}/shelters`);
    if (status !== 200) throwLiveError(status, body, "Could not load shelters.");
    shelters = (body as { shelters?: LiveShelter[] }).shelters ?? [];
  }

  if (surplusId) {
    const { status, body } = await liveFetch(`${FB}/surplus?include_all=true`);
    if (status !== 200) throwLiveError(status, body, "Could not load surplus lots.");
    const lots = (body as { surplus?: LiveLot[] }).surplus ?? [];
    lot = lots.find((x) => x.id === surplusId) ?? null;
    if (!lot) throw new ApiError("HTTP_404", `Surplus lot "${surplusId}" not found.`, 404);
  } else {
    const first = req.surplus_items[0];
    const itemName = first?.item ?? "surplus meals";
    const payload = {
      restaurant_id: req.restaurant_id,
      meal_count: Math.max(1, Math.round(first?.quantity ?? 0)),
      food_type: slugifyFoodType(itemName),
      dietary_tags: /veg/i.test(itemName) ? ["vegetarian"] : [],
      expires_in_hours: clampHours(req.constraints.pickup_window_start, req.constraints.pickup_window_end),
      notes: `via FOODLINK AI (${prettifyFoodType(slugifyFoodType(itemName))})`,
    };
    const { status, body } = await liveFetch(`${FB}/surplus`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (status !== 201 && status !== 200) throwLiveError(status, body, "Could not create a surplus lot.");
    const created = (body as { surplus?: LiveLot }).surplus;
    if (!created) throw new ApiError("UNKNOWN_SHAPE", "Surplus creation returned no lot.");
    lot = created;
  }

  // 2 · run the six-agent workflow on the live backend (up to 90s for LLM legs).
  const radius = Math.min(100, Math.max(0.5, req.constraints.max_distance_km || 10));
  const { status, body } = await liveFetch(
    `${FB}/match`,
    { method: "POST", body: JSON.stringify({ surplus_id: lot.id, requested_radius_km: radius }) },
    90000,
  );
  if (status !== 200) throwLiveError(status, body, "Match request failed.");
  const workflow = mapLiveMatch(body as LiveMatchResponse, { lot, restaurant, shelters });
  onUpdate(workflow);
  return { workflow, source: "live" };
}

/* FOODLINK AI — client state.
   Server/workflow state (normalized MatchWorkflow) is kept separate from
   local UI state (selection, replay position, motion prefs). */

import { create } from "zustand";
import { ApiError } from "../data/schemas";
import type { AgentKind, MatchRequest, MatchWorkflow, WorkflowError } from "../data/schemas";
import { LIVE_MODE, fetchLiveCatalog, postMatch, resetLiveDemo } from "../data/api-client";
import type { DataSource, LiveCatalog } from "../data/api-client";

export interface HistoryEntry {
  workflow: MatchWorkflow;
  source: DataSource;
  at: string;
  offeredQty: number;
  offeredUnit: string;
}

interface FoodlinkState {
  workflow: MatchWorkflow | null;
  history: HistoryEntry[];
  revealedCount: number;
  playing: boolean;
  loading: boolean;
  error: WorkflowError | null;
  source: DataSource | null;
  lastUpdated: string | null;
  stale: boolean;
  selectedAgent: AgentKind | null;
  motionPaused: boolean;
  forceFallback: boolean;
  webglLost: boolean;
  explore3D: boolean;
  lastRequest: MatchRequest | null;
  offeredByRun: Record<string, { qty: number; unit: string }>;
  runId: number;

  runMatch: (req: MatchRequest) => Promise<void>;
  selectWorkflow: (id: string) => void;
  liveCatalog: LiveCatalog | null;
  liveError: string | null;
  lastCatalogAt: number | null;
  loadLiveCatalog: () => Promise<void>;
  resetDemo: () => Promise<void>;
  setRevealedCount: (n: number) => void;
  setPlaying: (p: boolean) => void;
  revealAll: () => void;
  selectAgent: (a: AgentKind | null) => void;
  setMotionPaused: (p: boolean) => void;
  setForceFallback: (f: boolean) => void;
  setWebglLost: (lost: boolean) => void;
  setExplore3D: (e: boolean) => void;
  reset: () => void;
}

function toWorkflowError(err: unknown): WorkflowError {
  if (err instanceof ApiError) {
    const detail = (err as { detail?: string }).detail;
    return { code: err.code, message: err.message, detail };
  }
  if (err instanceof Error) return { code: "UNKNOWN", message: err.message };
  return { code: "UNKNOWN", message: "An unknown error occurred." };
}

export const useFoodlinkStore = create<FoodlinkState>()((set, get) => ({
  workflow: null,
  history: [],
  revealedCount: 0,
  playing: false,
  loading: false,
  error: null,
  source: null,
  lastUpdated: null,
  stale: false,
  selectedAgent: null,
  motionPaused: false,
  forceFallback: false,
  webglLost: false,
  explore3D: false,
  lastRequest: null,
  offeredByRun: {},
  liveCatalog: null,
  liveError: null,
  lastCatalogAt: null,
  runId: 0,

  loadLiveCatalog: async () => {
    if (!LIVE_MODE) return;
    try {
      const catalog = await fetchLiveCatalog();
      set({ liveCatalog: catalog, liveError: null, lastCatalogAt: Date.now() });
    } catch (err) {
      set({
        liveCatalog: null,
        liveError:
          err instanceof ApiError ? err.message : "Live catalog unavailable.",
      });
    }
  },

  resetDemo: async () => {
    if (!LIVE_MODE) return;
    await resetLiveDemo();
    await get().loadLiveCatalog();
  },

  runMatch: async (req: MatchRequest) => {
    const runId = get().runId + 1;
    const createdAt = new Date().toISOString();
    const offered = {
      qty: req.surplus_items.reduce((s, i) => s + i.quantity, 0),
      unit: req.surplus_items[0]?.unit ?? "—",
    };
    const offeredOf = (id: string): { qty: number; unit: string } =>
      get().offeredByRun[id] ?? {
        qty: (get().lastRequest?.surplus_items ?? []).reduce((s, i) => s + i.quantity, 0),
        unit: get().lastRequest?.surplus_items[0]?.unit ?? "—",
      };
    // Archive the outgoing run so judges can switch between workflows.
    const prev = get().workflow;
    const prevSource = get().source;
    const prevOffered = prev ? offeredOf(prev.id) : offered;
    const archived: HistoryEntry[] =
      prev && prev.agentEvents.length > 0
        ? [
            {
              workflow: prev,
              source: prevSource ?? "demo",
              at: prev.updatedAt,
              offeredQty: prevOffered.qty,
              offeredUnit: prevOffered.unit,
            },
            ...get().history,
          ].slice(0, 8)
        : get().history;
    set({
      runId,
      history: archived,
      loading: true,
      playing: false,
      error: null,
      stale: false,
      lastRequest: req,
      selectedAgent: null,
      // Intentional queued skeleton: no invented outcome, just pending state.
      workflow: {
        id: `wf-pending-${runId}`,
        status: "queued",
        createdAt,
        updatedAt: createdAt,
        destinations: [],
        allocations: [],
        agentEvents: [],
        connections: [],
      },
      revealedCount: 0,
    });
    try {
      const { workflow, source } = await postMatch(req, (wf) => {
        if (get().runId !== runId) return;
        set({
          workflow: wf,
          revealedCount: wf.agentEvents.length,
          lastUpdated: wf.updatedAt,
          offeredByRun: { ...get().offeredByRun, [wf.id]: offered },
        });
      });
      if (get().runId !== runId) return;
      set({
        workflow,
        // Live responses arrive whole: replay from step 0 with real pacing.
        revealedCount: source === "live" ? 0 : workflow.agentEvents.length,
        playing: source === "live" && workflow.agentEvents.length > 0,
        lastUpdated: workflow.updatedAt,
        source,
        loading: false,
      });
      if (source === "live") void get().loadLiveCatalog();
    } catch (err) {
      if (get().runId !== runId) return;
      const prev = get().workflow;
      // Preserve last valid state on refresh failure; flag staleness only when
      // we had real events to preserve. An event-less skeleton (e.g. rejected
      // validation) is cleared so the board can't stick on "Queued" + error.
      const hadData = prev !== null && prev.agentEvents.length > 0;
      set({
        loading: false,
        workflow: hadData ? prev : null,
        revealedCount: 0,
        error: toWorkflowError(err),
        stale: hadData,
        lastUpdated: hadData ? get().lastUpdated : null,
      });
      // Live lots change state on every attempt (including 409s) — refresh.
      void get().loadLiveCatalog();
    }
  },

  setRevealedCount: (n: number) => {
    const total = get().workflow?.agentEvents.length ?? 0;
    set({ revealedCount: Math.max(0, Math.min(total, n)), playing: false });
  },
  selectWorkflow: (id: string) => {
    const entry = get().history.find((h) => h.workflow.id === id);
    if (!entry) return;
    const current = get().workflow;
    const rest = get().history.filter((h) => h.workflow.id !== id);
    const curOffered = current
      ? (get().offeredByRun[current.id] ?? {
          qty: (get().lastRequest?.surplus_items ?? []).reduce((s, i) => s + i.quantity, 0),
          unit: get().lastRequest?.surplus_items[0]?.unit ?? "—",
        })
      : { qty: 0, unit: "—" };
    const archived: HistoryEntry[] =
      current && current.agentEvents.length > 0 && current.id !== id
        ? [
            {
              workflow: current,
              source: get().source ?? "demo",
              at: current.updatedAt,
              offeredQty: curOffered.qty,
              offeredUnit: curOffered.unit,
            },
            ...rest,
          ].slice(0, 8)
        : rest;
    set({
      history: archived,
      workflow: entry.workflow,
      source: entry.source,
      revealedCount: entry.workflow.agentEvents.length,
      playing: false,
      loading: false,
      error: null,
      stale: false,
      lastUpdated: entry.workflow.updatedAt,
      selectedAgent: null,
    });
  },
  setPlaying: (p: boolean) => set({ playing: p }),
  revealAll: () =>
    set((s) => ({ revealedCount: s.workflow?.agentEvents.length ?? 0, playing: false })),
  selectAgent: (a) => set({ selectedAgent: a }),
  setMotionPaused: (p) => set({ motionPaused: p }),
  setForceFallback: (f) => set({ forceFallback: f }),
  setWebglLost: (lost) => set({ webglLost: lost }),
  setExplore3D: (e) => set({ explore3D: e }),
  reset: () =>
    set({
      workflow: null,
      revealedCount: 0,
      playing: false,
      loading: false,
      error: null,
      source: null,
      lastUpdated: null,
      stale: false,
      selectedAgent: null,
    }),
}));

/** Events revealed by the replay position (single source for scene + DOM). */
export function useRevealedEvents() {
  const workflow = useFoodlinkStore((s) => s.workflow);
  const revealedCount = useFoodlinkStore((s) => s.revealedCount);
  if (!workflow) return [];
  return workflow.agentEvents.slice(0, revealedCount);
}

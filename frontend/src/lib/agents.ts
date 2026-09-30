import type { AgentEvent, AgentKind, AgentStatus } from "../data/schemas";
import { eventStatusToAgent } from "../data/schemas";
import { AGENT_ORDER } from "../data/schemas";

export interface AgentDisplay {
  agent: AgentKind;
  status: AgentStatus;
  activity: string;
  lastAt: string | null;
  confidence?: number;
  eventCount: number;
}

const IDLE_LABEL: Record<AgentKind, string> = {
  restaurant: "Awaiting surplus signal",
  matching: "Awaiting match request",
  shelter: "Awaiting demand signal",
  negotiation: "Awaiting proposal",
  logistics: "Awaiting agreed allocation",
  verification: "Awaiting handoff",
};

/** Derive per-agent display state from the revealed event slice. */
export function agentDisplay(events: AgentEvent[], agent: AgentKind): AgentDisplay {
  const mine = events.filter((e) => e.agent === agent);
  if (mine.length === 0) {
    return { agent, status: "idle", activity: IDLE_LABEL[agent], lastAt: null, eventCount: 0 };
  }
  const last = mine[mine.length - 1];
  const meta = last.metadata ?? {};
  const conf = typeof meta["confidence"] === "number" ? (meta["confidence"] as number) : undefined;
  return {
    agent,
    status: eventStatusToAgent(last.status),
    activity: last.message,
    lastAt: last.timestamp,
    confidence: conf,
    eventCount: mine.length,
  };
}

export function allAgentDisplays(events: AgentEvent[]): AgentDisplay[] {
  return AGENT_ORDER.map((a) => agentDisplay(events, a));
}

/* FOODLINK AI — canonical 3D layout + visual identity for the six agents.
   Positions form a hexagon-ish operations ring around the orchestration core. */

import type { AgentKind } from "../data/schemas";

export interface AgentLayout {
  kind: AgentKind;
  label: string;
  role: string;
  color: string;
  position: [number, number, number];
}

export const AGENT_LAYOUT: AgentLayout[] = [
  { kind: "restaurant", label: "Restaurant Agent", role: "Detects surplus & availability", color: "#ff5c6c", position: [-5.6, 0.8, 1.2] },
  { kind: "matching", label: "Matching Agent", role: "Finds & prioritizes demand", color: "#38bdf8", position: [0, 1.5, -0.4] },
  { kind: "shelter", label: "Shelter Agent", role: "Represents destination needs", color: "#34d399", position: [5.6, 0.8, 1.2] },
  { kind: "negotiation", label: "Negotiation Agent", role: "Resolves quantity & timing", color: "#f472b6", position: [-2.9, 0.6, 3.4] },
  { kind: "logistics", label: "Logistics Agent", role: "Plans route & delivery", color: "#60a5fa", position: [2.9, 0.6, 3.4] },
  { kind: "verification", label: "Verification Agent", role: "Confirms handoff & impact", color: "#a7f3d0", position: [0, 3.4, -2.8] },
];

export const LAYOUT_BY_AGENT: Record<AgentKind, AgentLayout> = Object.fromEntries(
  AGENT_LAYOUT.map((a) => [a.kind, a]),
) as Record<AgentKind, AgentLayout>;

/** Confirmed delivery path used for package travel (source → core → route → destination). */
export const DELIVERY_PATH: AgentKind[] = ["restaurant", "matching", "logistics", "shelter"];

export function positionOf(kind: AgentKind): [number, number, number] {
  return LAYOUT_BY_AGENT[kind].position;
}

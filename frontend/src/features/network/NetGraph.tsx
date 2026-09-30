import { AGENT_LAYOUT, positionOf } from "../../scene/agentLayout";
import type { AgentKind, AgentStatus, ConnectionState, NetworkConnection } from "../../data/schemas";
import type { AgentDisplay } from "../../lib/agents";

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

const EDGE_COLOR: Record<ConnectionState, string> = {
  idle: "#2c3a58",
  active: "#38bdf8",
  confirmed: "#34d399",
  dimmed: "#3b4c63",
  severed: "#f87171",
};

const STATUS_RING: Record<AgentStatus, string> = {
  idle: "#3b4c63",
  listening: "#38bdf8",
  processing: "#38bdf8",
  waiting: "#fbbf24",
  completed: "#34d399",
  warning: "#fbbf24",
  failed: "#f87171",
};

function project(kind: AgentKind): { x: number; y: number } {
  const [x, , z] = positionOf(kind);
  return { x: 320 + x * 46, y: 168 - z * 30 };
}

function edgePath(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const cx = (a.x + b.x) / 2;
  const cy = (a.y + b.y) / 2 - 30;
  return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
}

/**
 * Live 2D mirror of the 3D network: node state, edge state, and packet flow
 * all derive from revealed events and connection states. Fully clickable and
 * keyboard accessible — the realistic, working DOM counterpart of the scene.
 */
export function NetGraph({
  connections,
  displays,
  selected,
  onSelect,
  motionOK,
  flowing,
}: {
  connections: NetworkConnection[];
  displays: AgentDisplay[];
  selected: AgentKind | null;
  onSelect: (a: AgentKind) => void;
  motionOK: boolean;
  flowing: boolean;
}): React.JSX.Element {
  const byAgent = new Map(displays.map((d) => [d.agent, d]));
  const edges = TOPOLOGY.map((t) => {
    const live = connections.find((c) => c.id === t.id);
    return { ...t, state: live?.state ?? "idle", eventCount: live?.eventCount ?? 0 };
  });

  return (
    <svg
      viewBox="0 0 640 300"
      width="100%"
      role="group"
      aria-label="Live agent network topology. Nodes are selectable."
      style={{ display: "block" }}
    >
      <defs>
        <radialGradient id="netgrid" cx="50%" cy="45%" r="75%">
          <stop offset="0%" stopColor="#101a2e" />
          <stop offset="100%" stopColor="#080b10" />
        </radialGradient>
      </defs>
      <rect width="640" height="300" fill="url(#netgrid)" rx="12" />
      {Array.from({ length: 9 }, (_, i) => (
        <line key={`v${i}`} x1={40 + i * 70} y1={10} x2={40 + i * 70} y2={290} stroke="rgba(148,184,255,0.06)" strokeWidth="1" />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <line key={`h${i}`} x1={10} y1={40 + i * 55} x2={630} y2={40 + i * 55} stroke="rgba(148,184,255,0.06)" strokeWidth="1" />
      ))}

      {/* edges */}
      {edges.map((e) => {
        const d = edgePath(project(e.from), project(e.to));
        const color = EDGE_COLOR[e.state as ConnectionState];
        return (
          <g key={e.id}>
            <title>{`${e.from} → ${e.to}: ${e.state}, ${e.eventCount} events`}</title>
            <path d={d} fill="none" stroke={color} strokeWidth={e.state === "active" || e.state === "confirmed" ? 5 : 2.5} opacity={0.18} strokeLinecap="round" />
            <path
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={e.state === "active" || e.state === "confirmed" ? 2.2 : 1.4}
              opacity={e.state === "idle" ? 0.5 : 0.95}
              strokeDasharray={e.state === "active" ? "7 6" : e.state === "severed" ? "5 6" : undefined}
              className={e.state === "active" && motionOK ? "net-edge-flow" : undefined}
              strokeLinecap="round"
            />
            {/* live packet dots on flowing edges */}
            {(e.state === "active" || e.state === "confirmed") && flowing ? (
              <>
                <circle r={e.state === "confirmed" ? 3 : 3.6} fill={e.state === "confirmed" ? "#a7f3d0" : "#bae6fd"} className="pkt"
                  style={{ offsetPath: `path("${d}")`, animationDuration: e.state === "confirmed" ? "5.5s" : "2.6s", animationPlayState: motionOK ? "running" : "paused" }} />
                {e.state === "active" ? (
                  <circle r={2.4} fill="#bae6fd" opacity={0.85} className="pkt"
                    style={{ offsetPath: `path("${d}")`, animationDuration: "2.6s", animationDelay: "-1.3s", animationPlayState: motionOK ? "running" : "paused" }} />
                ) : null}
              </>
            ) : null}
            {/* midpoint event count */}
            {e.eventCount > 0 ? (
              <text
                x={(project(e.from).x + project(e.to).x) / 2}
                y={(project(e.from).y + project(e.to).y) / 2 - 30}
                textAnchor="middle"
                fill="#5d687f"
                fontSize="9.5"
                fontFamily="monospace"
              >
                {e.eventCount}
              </text>
            ) : null}
          </g>
        );
      })}

      {/* nodes */}
      {AGENT_LAYOUT.map((l) => {
        const p = project(l.kind);
        const d = byAgent.get(l.kind);
        const status: AgentStatus = d?.status ?? "idle";
        const isSel = selected === l.kind;
        const busy = status === "processing" || status === "listening";
        return (
          <g
            key={l.kind}
            transform={`translate(${p.x} ${p.y})`}
            tabIndex={0}
            role="button"
            aria-label={`${l.label}, ${status}, ${d?.eventCount ?? 0} events. Activate to inspect.`}
            onClick={() => onSelect(l.kind)}
            onKeyDown={(ev) => {
              if (ev.key === "Enter" || ev.key === " ") {
                ev.preventDefault();
                onSelect(l.kind);
              }
            }}
            style={{ cursor: "pointer", outline: "none" }}
          >
            {busy && motionOK ? <circle r={17} fill="none" stroke={STATUS_RING[status]} strokeWidth={2} className="net-pulse" /> : null}
            <circle r={16} fill="#0d1420" stroke={l.color} strokeWidth={2.2} opacity={0.98} />
            <circle r={16} fill="none" stroke={STATUS_RING[status]} strokeWidth={1.4} strokeDasharray={status === "completed" ? "none" : "4 3"} opacity={0.9} />
            {isSel ? <circle r={21} fill="none" stroke="#ffd166" strokeWidth={2} /> : null}
            <text textAnchor="middle" dy={5} fill="#f5f8ff" fontSize={13} fontWeight={800} fontFamily="Bricolage Grotesque, Inter, sans-serif">
              {l.label.charAt(0)}
            </text>
            <text textAnchor="middle" y={32} fill={isSel ? "#ffd166" : "#8f9bb3"} fontSize={10} fontFamily="monospace">
              {l.kind.slice(0, 4).toUpperCase()}·{d?.eventCount ?? 0}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

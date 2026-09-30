import { AGENT_LAYOUT } from "../scene/agentLayout";
import { allAgentDisplays } from "../lib/agents";
import { useFoodlinkStore, useRevealedEvents } from "../store/useFoodlinkStore";
import { AgentIcon, StatusDot, WorkflowBadge } from "./ui";
import { formatClock } from "../lib/format";

/**
 * No-WebGL / text-only equivalent of the 3D network.
 * Preserves every relationship the scene shows: agents, statuses, activity,
 * connections, and event counts.
 */
export function NetworkFallback(): React.JSX.Element {
  const workflow = useFoodlinkStore((s) => s.workflow);
  const revealed = useRevealedEvents();
  const selected = useFoodlinkStore((s) => s.selectedAgent);
  const selectAgent = useFoodlinkStore((s) => s.selectAgent);
  const displays = allAgentDisplays(revealed);
  const byAgent = new Map(displays.map((d) => [d.agent, d]));

  return (
    <div className="panel panel-inner">
      <p style={{ marginTop: 0, color: "var(--ink-2)", fontSize: 14 }}>
        Cinematic 3D visualization unavailable — showing the equivalent text network. No
        information is lost in this mode.
      </p>
      {workflow ? (
        <div style={{ marginBottom: 14 }}>
          <WorkflowBadge status={workflow.status} />
        </div>
      ) : null}
      <div className="fallback-net" role="list" aria-label="Agent network">
        {AGENT_LAYOUT.map((l, i) => {
          const d = byAgent.get(l.kind);
          const conns = (workflow?.connections ?? []).filter(
            (c) => c.from === l.kind || c.to === l.kind,
          );
          return (
            <div key={l.kind}>
              <div
                role="listitem"
                className={`agent-row${selected === l.kind ? " selected" : ""}`}
                tabIndex={0}
                aria-label={`${l.label}, status ${d?.status ?? "idle"}${d?.activity ? `, ${d.activity}` : ""}`}
                onClick={() => selectAgent(l.kind)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    selectAgent(l.kind);
                  }
                }}
              >
                <span className="agent-ico">
                  <AgentIcon agent={l.kind} color={l.color} />
                </span>
                <span style={{ flex: 1 }}>
                  <span className="an">{l.label}</span>
                  <span className="ar" style={{ display: "block" }}>{l.role}</span>
                  <span className="al" style={{ display: "block" }}>
                    {d?.activity ?? "Awaiting workflow"}
                    {d?.lastAt ? ` · ${formatClock(d.lastAt)}` : ""}
                  </span>
                  {conns.length > 0 ? (
                    <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)", display: "block", marginTop: 4 }}>
                      links: {conns.map((c) => `${c.from}→${c.to} [${c.state}, ${c.eventCount} evts]`).join(" · ")}
                    </span>
                  ) : null}
                </span>
                <StatusDot status={d?.status ?? "idle"} />
              </div>
              {i < AGENT_LAYOUT.length - 1 ? (
                <div
                  className={`fallback-link${i === 2 ? " dim" : ""}`}
                  aria-hidden="true"
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

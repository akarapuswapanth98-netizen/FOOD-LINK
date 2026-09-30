import { useEffect, useRef } from "react";
import { Radio, Network, Terminal } from "lucide-react";
import { AGENT_LAYOUT } from "../../scene/agentLayout";
import { allAgentDisplays } from "../../lib/agents";
import { useFoodlinkStore, useRevealedEvents } from "../../store/useFoodlinkStore";
import { useMotionAllowed } from "../../hooks/prefs";
import { NetGraph } from "./NetGraph";
import { AgentIcon, AGENT_NAMES, SectionHead, StatusDot, WorkflowBadge } from "../../components/ui";
import { Section } from "../../components/Chrome";
import { NetworkFallback } from "../../components/NetworkFallback";
import { formatClock } from "../../lib/format";
import type { AgentStatus } from "../../data/schemas";

const STATUS_TEXT: Record<AgentStatus, string> = {
  idle: "Idle",
  listening: "Listening",
  processing: "Processing",
  waiting: "Waiting",
  completed: "Completed",
  warning: "Needs attention",
  failed: "Failed",
};

export function NetworkSection({ noWebGL }: { noWebGL: boolean }): React.JSX.Element {
  const workflow = useFoodlinkStore((s) => s.workflow);
  const loading = useFoodlinkStore((s) => s.loading);
  const selected = useFoodlinkStore((s) => s.selectedAgent);
  const selectAgent = useFoodlinkStore((s) => s.selectAgent);
  const history = useFoodlinkStore((s) => s.history);
  const selectWorkflow = useFoodlinkStore((s) => s.selectWorkflow);
  const motionOK = useMotionAllowed();
  const revealed = useRevealedEvents();
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest", behavior: motionOK ? "smooth" : "auto" });
  }, [revealed.length, motionOK]);
  const displays = allAgentDisplays(revealed);
  const byAgent = new Map(displays.map((d) => [d.agent, d]));
  const detail = selected ? byAgent.get(selected) : undefined;
  const layout = AGENT_LAYOUT.find((l) => l.kind === selected);

  return (
    <Section id="network">
      <SectionHead
        eyebrow="01 · Live multi-agent network"
        title="Six agents, one shared picture of the rescue."
        lede="Status here is driven by workflow events — never simulated. Selecting an agent highlights it in the 3D scene and opens its live detail."
      />
      <div className="legend" style={{ marginBottom: 18 }} aria-label="Agent status legend">
        {(Object.keys(STATUS_TEXT) as AgentStatus[]).map((s) => (
          <span key={s} className="badge b-grey">
            <StatusDot status={s} /> {STATUS_TEXT[s]}
          </span>
        ))}
      </div>
      {history.length > 0 && workflow ? (
        <div className="field" style={{ maxWidth: 460 }}>
          <label htmlFor="wf-select">Active workflow — {history.length} archived run{history.length === 1 ? "" : "s"} available</label>
          <select
            id="wf-select"
            value={workflow?.id ?? ""}
            onChange={(e) => selectWorkflow(e.target.value)}
          >
            {workflow ? (
              <option value={workflow.id}>
                Current · {workflow.status} · {workflow.agentEvents.length} events
              </option>
            ) : null}
            {history.map((h) => (
              <option key={h.workflow.id} value={h.workflow.id}>
                {h.workflow.status} · {h.workflow.agentEvents.length} events · {formatClock(h.at)}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="panel panel-inner" style={{ marginBottom: 20, padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "2px 6px" }}>
          <Network size={16} aria-hidden="true" style={{ color: "var(--indigo)" }} />
          <strong style={{ color: "var(--ink-0)" }}>Live topology</strong>
          <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
            packets flow only on edges with real events · click any node
          </span>
          <span style={{ marginLeft: "auto" }}>
            {workflow ? <WorkflowBadge status={workflow.status} /> : <span className="badge b-grey">standby</span>}
          </span>
        </div>
        <NetGraph
          connections={workflow?.connections ?? []}
          displays={displays}
          selected={selected}
          onSelect={(a) => selectAgent(selected === a ? null : a)}
          motionOK={motionOK}
          flowing={workflow?.status === "running" || workflow?.status === "completed" || workflow?.status === "partial"}
        />
      </div>

      {noWebGL ? (
        <NetworkFallback />
      ) : (
        <div className="split-21">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }} role="list" aria-label="Agents">
            {AGENT_LAYOUT.map((l) => {
              const d = byAgent.get(l.kind);
              const isSel = selected === l.kind;
              return (
                <button
                  key={l.kind}
                  type="button"
                  role="listitem"
                  className={`agent-row${isSel ? " selected" : ""}`}
                  aria-pressed={isSel}
                  onClick={() => selectAgent(isSel ? null : l.kind)}
                >
                  <span className="agent-ico">
                    <AgentIcon agent={l.kind} color={l.color} />
                  </span>
                  <span style={{ flex: 1 }}>
                    <span className="an">{l.label}</span>
                    <span className="ar" style={{ display: "block" }}>{l.role}</span>
                    <span className="al" style={{ display: "block" }}>
                      {d?.activity ?? "Awaiting workflow"}
                    </span>
                    <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)", display: "block", marginTop: 3 }}>
                      {d?.eventCount ?? 0} events{d?.lastAt ? ` · last ${formatClock(d.lastAt)}` : ""}
                      {typeof d?.confidence === "number" ? ` · conf ${(d.confidence * 100).toFixed(0)}%` : ""}
                    </span>
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    <StatusDot status={d?.status ?? "idle"} pulse />
                    <span className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-2)" }}>
                      {STATUS_TEXT[d?.status ?? "idle"]}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="panel panel-inner" aria-live="polite">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Radio size={16} aria-hidden="true" style={{ color: "var(--cyan)" }} />
              <strong style={{ color: "var(--ink-0)" }}>Node detail</strong>
              <span style={{ marginLeft: "auto" }}>
                {workflow ? <WorkflowBadge status={workflow.status} /> : <span className="badge b-grey">no workflow</span>}
              </span>
            </div>
            {detail && layout ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <span className="agent-ico" style={{ width: 46, height: 46 }}>
                    <AgentIcon agent={layout.kind} color={layout.color} size={22} />
                  </span>
                  <div>
                    <div style={{ color: "var(--ink-0)", fontWeight: 700 }}>{layout.label}</div>
                    <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{layout.role}</div>
                  </div>
                </div>
                <p style={{ fontSize: 14, color: "var(--ink-1)" }}>{detail.activity}</p>
                <dl className="mono" style={{ fontSize: 12, color: "var(--ink-2)", display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 14px", marginTop: 12 }}>
                  <dt>Status</dt>
                  <dd style={{ margin: 0 }}>{STATUS_TEXT[detail.status]}</dd>
                  <dt>Events</dt>
                  <dd style={{ margin: 0 }}>{detail.eventCount}</dd>
                  <dt>Last event</dt>
                  <dd style={{ margin: 0 }}>{detail.lastAt ? formatClock(detail.lastAt) : "—"}</dd>
                  {typeof detail.confidence === "number" ? (
                    <>
                      <dt>Confidence</dt>
                      <dd style={{ margin: 0 }}>{(detail.confidence * 100).toFixed(0)}% (as reported)</dd>
                    </>
                  ) : null}
                </dl>
                <div style={{ marginTop: 14 }}>
                  <p className="mono" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)" }}>
                    Connections
                  </p>
                  {(workflow?.connections ?? [])
                    .filter((c) => c.from === layout.kind || c.to === layout.kind)
                    .map((c) => (
                      <div key={c.id} className="mono" style={{ fontSize: 12, color: "var(--ink-1)", padding: "6px 0", borderBottom: "1px solid var(--hairline)" }}>
                        {AGENT_NAMES[c.from]} → {AGENT_NAMES[c.to]} · <strong>{c.state}</strong> · {c.eventCount} events
                      </div>
                    ))}
                  {(workflow?.connections ?? []).filter((c) => c.from === layout.kind || c.to === layout.kind).length === 0 ? (
                    <p style={{ fontSize: 13, color: "var(--ink-3)" }}>No connections yet — run a match to activate the network.</p>
                  ) : null}
                </div>
              </div>
            ) : (
              <p style={{ color: "var(--ink-2)", fontSize: 14 }}>
                {loading || workflow
                  ? "Select an agent on the left to inspect its live state, connections, and event history."
                  : "No workflow yet. Run a match from the control panel — agents will activate here and in the 3D scene as real events arrive."}
              </p>
            )}
          </div>
        </div>
      )}
      <div className="panel panel-inner" style={{ marginTop: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <Terminal size={16} aria-hidden="true" style={{ color: "var(--leaf)" }} />
          <strong style={{ color: "var(--ink-0)" }}>Agent console</strong>
          <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>raw event stream · newest last</span>
          <span className="badge b-emerald" style={{ marginLeft: "auto" }}>
            <span className={`dot emerald${loading || workflow?.status === "running" ? " pulse" : ""}`} aria-hidden="true" />
            {loading || workflow?.status === "running" ? "streaming" : "idle"}
          </span>
        </div>
        <div className="console" role="log" aria-label="Agent console stream" aria-live="off">
          {revealed.length === 0 ? (
            <span style={{ color: "var(--ink-3)" }}>$ awaiting agent activity…</span>
          ) : (
            revealed.slice(-12).map((e) => {
              const color = AGENT_LAYOUT.find((l) => l.kind === e.agent)?.color ?? "#38bdf8";
              return (
                <div key={e.id} className="console-line">
                  <span className="console-time">{formatClock(e.timestamp)}</span>
                  <span className="console-agent" style={{ color }}>{e.agent}</span>
                  <span className="console-msg">{e.message}</span>
                </div>
              );
            })
          )}
          <div ref={endRef} aria-hidden="true">
            <span style={{ color: "var(--ink-3)" }}>$ </span>
            <span className="cursor-blink" aria-hidden="true" />
          </div>
        </div>
      </div>
    </Section>
  );
}

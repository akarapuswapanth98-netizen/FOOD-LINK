import { useEffect, useState } from "react";
import { Activity, Download } from "lucide-react";
import { AGENT_ORDER } from "../../data/schemas";
import { AGENT_LAYOUT } from "../../scene/agentLayout";
import { allAgentDisplays } from "../../lib/agents";
import { useFoodlinkStore, useRevealedEvents } from "../../store/useFoodlinkStore";
import { Section } from "../../components/Chrome";
import { AgentIcon, LastUpdated, Metric, SectionHead, StatusDot } from "../../components/ui";
import { formatNum, timeAgo } from "../../lib/format";

/**
 * Operations dashboard — every metric derives from workflow state, run
 * history, or revealed events. Debugged: the freshness clock ticks live,
 * offered-vs-allocated quantities are shown separately (no silent mismatch
 * when browsing archived runs), and throughput/health are computed, not fixed.
 */
export function OperationsSection(): React.JSX.Element {
  const workflow = useFoodlinkStore((s) => s.workflow);
  const history = useFoodlinkStore((s) => s.history);
  const loading = useFoodlinkStore((s) => s.loading);
  const lastUpdated = useFoodlinkStore((s) => s.lastUpdated);
  const stale = useFoodlinkStore((s) => s.stale);
  const source = useFoodlinkStore((s) => s.source);
  const lastRequest = useFoodlinkStore((s) => s.lastRequest);
  const revealed = useRevealedEvents();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const events = workflow?.agentEvents ?? [];
  const allocs = workflow?.allocations ?? [];
  const isActive = workflow?.status === "running" || workflow?.status === "queued" || loading;

  // Offered (requested) vs actually allocated — per-run numbers, so browsing
  // archived runs never shows a mismatched request.
  const archivedEntry = workflow ? history.find((h) => h.workflow.id === workflow.id) : undefined;
  const offered = archivedEntry
    ? archivedEntry.offeredQty
    : (lastRequest?.surplus_items ?? []).reduce((s, i) => s + i.quantity, 0);
  const offeredUnit = archivedEntry
    ? archivedEntry.offeredUnit
    : (lastRequest?.surplus_items[0]?.unit ?? "—");
  const allocated = allocs.reduce((s, a) => s + a.quantity, 0);
  const pending = allocs.filter((a) => a.status === "pending" || a.status === "unresolved").length;
  const confirmed = allocs.filter((a) => a.status === "confirmed").length;
  const exceptions = events.filter((e) => e.status === "warning" || e.status === "failed").length;
  const duration = workflow?.summary
    ? `${(workflow.summary.matchDurationMs / 1000).toFixed(1)}s`
    : events.length >= 2
      ? `${((Date.parse(events[events.length - 1].timestamp) - Date.parse(events[0].timestamp)) / 1000).toFixed(1)}s`
      : "—";

  // Throughput: revealed events per elapsed minute of this run.
  const elapsedMin =
    events.length >= 1 ? Math.max(1 / 60, (now - Date.parse(events[0].timestamp)) / 60000) : 0;
  const throughput = elapsedMin > 0 ? (revealed.length / elapsedMin).toFixed(1) : "—";

  // Run ledger across this session (current + archived).
  const runs = [
    ...(workflow && events.length > 0 ? [workflow] : []),
    ...history.map((h) => h.workflow),
  ];
  const count = (s: string): number => runs.filter((w) => w.status === s).length;

  const displays = allAgentDisplays(revealed);
  const colorOf = (kind: (typeof AGENT_ORDER)[number]): string =>
    AGENT_LAYOUT.find((l) => l.kind === kind)?.color ?? "#38bdf8";

  return (
    <Section id="operations">
      <SectionHead
        eyebrow="06 · Live operations dashboard"
        title="Operational truth, not vanity metrics."
        lede="Every figure is computed from the current workflow, its events, and the archived run ledger. Before the first run, counters honestly read zero."
      />
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <span className="status-pill" role="status" aria-label={isActive ? "System live, match in progress" : "System live, idle"}>
          <span className={`dot ${isActive ? "ember pulse" : "emerald"}`} aria-hidden="true" />
          {isActive ? "LIVE · MATCHING" : "LIVE · IDLE"}
        </span>
        <LastUpdated iso={lastUpdated} stale={stale} />
        <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>
          sync: {lastUpdated ? timeAgo(lastUpdated, now) : "never"} · {source === "demo" ? "demo adapter" : source === "live" ? "live backend" : "no source"}
        </span>
        <button
          type="button"
          className="icon-btn"
          disabled={!workflow}
          onClick={() => {
            if (!workflow) return;
            const blob = new Blob(
              [JSON.stringify({ exportedAt: new Date().toISOString(), source, workflow }, null, 2)],
              { type: "application/json" },
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `foodlink-report-${workflow.id}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          style={{ marginLeft: "auto" }}
        >
          <Download size={14} aria-hidden="true" /> Export ops report
        </button>
      </div>

      <div className="grid-4">
        <Metric value={isActive ? "1" : "0"} label="Active workflows" sub={isActive ? "match in progress" : "none running"} />
        <Metric value={formatNum(offered)} label="Meals offered" sub={archivedEntry ? `this archived run · ${offeredUnit}` : lastRequest ? `last request · ${offeredUnit}` : "no request yet"} />
        <Metric value={formatNum(allocated)} label="Meals allocated" sub="this workflow's confirmed + pending" />
        <Metric value={String(pending)} label="Pending allocations" sub="awaiting courier / confirm" />
        <Metric value={String(confirmed)} label="Confirmed deliveries" sub="this workflow" />
        <Metric value={duration} label="Match time" sub="first → last event" />
        <Metric value={String(exceptions)} label="Exceptions" sub="warnings + failures" />
        <Metric value={throughput} label="Events / min" sub="revealed throughput" />
      </div>

      <div className="split-12" style={{ marginTop: 16 }}>
        <div className="panel panel-inner">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <Activity size={16} aria-hidden="true" style={{ color: "var(--indigo)" }} />
            <strong style={{ color: "var(--ink-0)" }}>Agent health — this run</strong>
            <span className="mono" style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--ink-3)" }}>
              {revealed.length}/{events.length} events revealed
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            {displays.map((d) => (
              <div key={d.agent} className="agent-row" style={{ cursor: "default", padding: "10px 12px" }}>
                <span className="agent-ico" style={{ width: 32, height: 32 }}>
                  <AgentIcon agent={d.agent} color={colorOf(d.agent)} size={15} />
                </span>
                <span style={{ flex: 1 }}>
                  <span className="an" style={{ fontSize: 12.5 }}>{AGENT_ORDER.indexOf(d.agent) + 1} · {d.agent}</span>
                  <span className="mono" style={{ display: "block", fontSize: 10.5, color: "var(--ink-3)" }}>
                    {d.status} · {d.eventCount} evts
                  </span>
                </span>
                <StatusDot status={d.status} pulse />
              </div>
            ))}
          </div>
        </div>

        <div className="panel panel-inner">
          <strong style={{ color: "var(--ink-0)" }}>Session run ledger</strong>
          <p className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 4 }}>
            {runs.length} run{runs.length === 1 ? "" : "s"} observed · switch runs in §01 Network
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <span className="badge b-emerald">completed · {count("completed")}</span>
            <span className="badge b-amber">partial · {count("partial")}</span>
            <span className="badge b-amber">empty · {count("empty")}</span>
            <span className="badge b-red">failed · {count("failed")}</span>
            <span className="badge b-cyan">running · {count("running") + count("queued")}</span>
          </div>
          {runs.length > 0 ? (
            <ul className="mono" style={{ listStyle: "none", margin: "14px 0 0", padding: 0, fontSize: 12, color: "var(--ink-2)", display: "flex", flexDirection: "column", gap: 8 }}>
              {runs.slice(0, 5).map((w) => (
                <li key={w.id} style={{ display: "flex", gap: 10, borderBottom: "1px solid var(--hairline)", paddingBottom: 8 }}>
                  <span style={{ color: "var(--ink-0)" }}>{w.status}</span>
                  <span>{w.agentEvents.length} evts</span>
                  <span>{w.allocations.reduce((s, a) => s + a.quantity, 0)} meals</span>
                  <span style={{ marginLeft: "auto", color: "var(--ink-3)" }}>{w.id.slice(-6)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ fontSize: 13, color: "var(--ink-3)" }}>No runs yet — dispatch from the surplus board or control panel.</p>
          )}
        </div>
      </div>
    </Section>
  );
}

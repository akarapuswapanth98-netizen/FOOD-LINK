import { BarChart3 } from "lucide-react";
import { AGENT_ORDER } from "../../data/schemas";
import { AGENT_LAYOUT } from "../../scene/agentLayout";
import { useFoodlinkStore } from "../../store/useFoodlinkStore";
import { Section } from "../../components/Chrome";
import { AGENT_NAMES, EmptyState, Metric, SectionHead } from "../../components/ui";
import { formatNum } from "../../lib/format";
import type { MatchWorkflow } from "../../data/schemas";

function mealsOf(w: MatchWorkflow): number {
  if (w.summary) return w.summary.mealsRescued;
  return w.allocations.reduce((s, a) => s + a.quantity, 0);
}

function shortId(id: string): string {
  const tail = id.split("-").pop() ?? id;
  return tail.slice(-4).toUpperCase();
}

/** Rescue analytics across every run this session — charted from real runs. */
export function AnalyticsSection(): React.JSX.Element {
  const workflow = useFoodlinkStore((s) => s.workflow);
  const history = useFoodlinkStore((s) => s.history);

  const runs = [
    ...[...history].reverse().map((h) => h.workflow),
    ...(workflow && workflow.agentEvents.length > 0 ? [workflow] : []),
  ];
  const maxMeals = Math.max(1, ...runs.map(mealsOf));
  const totalMeals = runs.reduce((s, w) => s + mealsOf(w), 0);
  const successes = runs.filter((w) => w.status === "completed").length;
  const durations = runs
    .map((w) =>
      w.summary
        ? w.summary.matchDurationMs
        : w.agentEvents.length >= 2
          ? Date.parse(w.agentEvents[w.agentEvents.length - 1].timestamp) - Date.parse(w.agentEvents[0].timestamp)
          : 0,
    )
    .filter((d) => d > 0);
  const avgDur = durations.length ? durations.reduce((s, d) => s + d, 0) / durations.length : 0;

  const agentTotals = AGENT_ORDER.map((a) => ({
    agent: a,
    count: runs.reduce((s, w) => s + w.agentEvents.filter((e) => e.agent === a).length, 0),
  }));
  const maxAgent = Math.max(1, ...agentTotals.map((t) => t.count));
  const colorOf = (kind: (typeof AGENT_ORDER)[number]): string =>
    AGENT_LAYOUT.find((l) => l.kind === kind)?.color ?? "#818cf8";

  return (
    <Section id="analytics">
      <SectionHead
        eyebrow="09 · Rescue analytics"
        title="Every run, charted. Trends judges can quote."
        lede="Meals rescued per run and agent workload across this session — computed from archived workflows, including failed and empty runs. Nothing is smoothed or sampled."
      />
      {runs.length === 0 ? (
        <EmptyState
          title="No runs to analyze yet"
          body="Run two or more matches (try different control-panel scenarios) and this section charts meals, success rate, and agent workload across all of them."
        />
      ) : (
        <>
          <div className="grid-4" style={{ marginBottom: 16 }}>
            <Metric value={formatNum(totalMeals)} label="Meals rescued" sub={`across ${runs.length} run${runs.length === 1 ? "" : "s"}`} />
            <Metric value={runs.length === 0 ? "—" : `${Math.round((successes / runs.length) * 100)}%`} label="Full-success rate" sub={`${successes}/${runs.length} completed`} />
            <Metric value={avgDur > 0 ? `${(avgDur / 1000).toFixed(1)}s` : "—"} label="Avg match time" sub="first → last event" />
            <Metric value={String(runs.reduce((s, w) => s + w.agentEvents.length, 0))} label="Total agent events" sub="all runs observed" />
          </div>
          <div className="split-32">
            <div className="panel panel-inner">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <BarChart3 size={16} aria-hidden="true" style={{ color: "var(--ember)" }} />
                <strong style={{ color: "var(--ink-0)" }}>Meals rescued per run</strong>
              </div>
              <svg viewBox="0 0 600 240" width="100%" role="img" aria-label={`Bar chart of meals rescued across ${runs.length} runs`}>
                <defs>
                  <linearGradient id="barEmber" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff8a95" />
                    <stop offset="100%" stopColor="#e11d48" />
                  </linearGradient>
                </defs>
                {[40, 90, 140, 190].map((y) => (
                  <line key={y} x1="44" y1={y} x2="592" y2={y} stroke="rgba(165,180,252,0.1)" strokeWidth="1" />
                ))}
                {runs.map((w, i) => {
                  const n = Math.min(8, runs.length);
                  const slot = 548 / Math.max(1, n);
                  const bw = Math.min(64, slot * 0.55);
                  const x = 44 + (548 / Math.max(1, runs.length)) * i + (548 / Math.max(1, runs.length) - bw) / 2;
                  const h = Math.max(4, (mealsOf(w) / maxMeals) * 150);
                  const ok = w.status === "completed";
                  return (
                    <g key={w.id}>
                      <rect x={x} y={190 - h} width={bw} height={h} rx={6}
                        fill={ok ? "url(#barEmber)" : w.status === "failed" ? "#f87171" : "#655d8a"}
                        opacity={ok ? 1 : 0.75} />
                      <text x={x + bw / 2} y={182 - h} textAnchor="middle" fill="#f6f3ff" fontSize="13" fontFamily="monospace" fontWeight="700">
                        {mealsOf(w)}
                      </text>
                      <text x={x + bw / 2} y={208} textAnchor="middle" fill="#948cb8" fontSize="10.5" fontFamily="monospace">
                        {shortId(w.id)}
                      </text>
                      <text x={x + bw / 2} y={222} textAnchor="middle" fill={ok ? "#34d399" : w.status === "failed" ? "#f87171" : "#fbbf24"} fontSize="10" fontFamily="monospace">
                        {w.status}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <div className="panel panel-inner">
              <strong style={{ color: "var(--ink-0)" }}>Agent workload</strong>
              <p className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 4 }}>events handled per agent, all runs</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                {agentTotals.map((t) => (
                  <div key={t.agent}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                      <span style={{ color: "var(--ink-1)" }}>{AGENT_NAMES[t.agent]}</span>
                      <span className="num" style={{ color: "var(--ink-0)" }}>{t.count}</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 5, background: "rgba(165,180,252,0.1)", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.max(3, (t.count / maxAgent) * 100)}%`,
                          borderRadius: 5,
                          background: colorOf(t.agent),
                          boxShadow: `0 0 12px ${colorOf(t.agent)}66`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </Section>
  );
}

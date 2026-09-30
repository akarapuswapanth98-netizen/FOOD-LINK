import { useEffect, useMemo, useState } from "react";
import { Send, Loader2, Check, ArrowRight } from "lucide-react";
import { RESTAURANTS } from "../../data/mock-adapter";
import { LIVE_MODE } from "../../data/api-client";
import { AGENT_ORDER } from "../../data/schemas";
import { useFoodlinkStore } from "../../store/useFoodlinkStore";
import { Section } from "../../components/Chrome";
import { AgentIcon, EmptyState, Notice, SectionHead, WorkflowBadge } from "../../components/ui";
import { formatClock } from "../../lib/format";

function defaultWindow(): { start: string; end: string } {
  const now = new Date();
  const fmt = (d: Date): string => {
    const p = (n: number): string => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  return {
    start: fmt(new Date(now.getTime() + 30 * 60000)),
    end: fmt(new Date(now.getTime() + 4 * 3600000)),
  };
}

const PIPELINE_LABEL: Record<string, string> = {
  restaurant: "Detect",
  matching: "Match",
  shelter: "Demand",
  negotiation: "Deal",
  logistics: "Route",
  verification: "Verify",
};

export function MatchEngine(): React.JSX.Element {
  const runMatch = useFoodlinkStore((s) => s.runMatch);
  const loading = useFoodlinkStore((s) => s.loading);
  const workflow = useFoodlinkStore((s) => s.workflow);
  const error = useFoodlinkStore((s) => s.error);
  const source = useFoodlinkStore((s) => s.source);
  const win = useMemo(defaultWindow, []);

  const [restaurantId, setRestaurantId] = useState(RESTAURANTS[0].id);
  const [item, setItem] = useState("Chicken Dum Biryani");
  const [quantity, setQuantity] = useState("32");
  const [unit, setUnit] = useState("meals");
  const [maxDistance, setMaxDistance] = useState("8");
  const [start, setStart] = useState(win.start);
  const [end, setEnd] = useState(win.end);
  const [formError, setFormError] = useState<string | null>(null);
  const liveCatalog = useFoodlinkStore((s) => s.liveCatalog);
  const liveError = useFoodlinkStore((s) => s.liveError);
  const restaurantOptions = liveCatalog
    ? liveCatalog.restaurants.map((r) => ({ id: r.id, name: r.name, address: r.address }))
    : RESTAURANTS;
  useEffect(() => {
    if (restaurantOptions.length > 0 && !restaurantOptions.some((o) => o.id === restaurantId)) {
      setRestaurantId(restaurantOptions[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveCatalog]);

  const restaurant = restaurantOptions.find((r) => r.id === restaurantId) ?? {
    id: restaurantId,
    name: restaurantId,
    address: "",
  };
  const events = workflow?.agentEvents ?? [];
  const agentDone = (a: string): boolean => events.some((e) => e.agent === a && (e.status === "completed" || e.status === "warning"));
  const lastOf = (a: string): string | undefined => [...events].reverse().find((e) => e.agent === a)?.status;
  const agentActive = (a: string): boolean => {
    const s = lastOf(a);
    return workflow?.status === "running" && (s === "started" || s === "progress");
  };

  const submit = async (): Promise<void> => {
    setFormError(null);
    const qty = Number(quantity);
    if (!item.trim()) {
      setFormError("Step 1 is incomplete — describe the surplus item (e.g. Chicken Dum Biryani).");
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      setFormError("Step 1 is incomplete — quantity must be a number greater than zero.");
      return;
    }
    await runMatch({
      restaurant_id: restaurantId,
      surplus_items: [
        {
          item: item.trim(),
          quantity: qty,
          unit: unit.trim() || "units",
          expires_at: new Date(end).toISOString(),
        },
      ],
      constraints: {
        max_distance_km: Number(maxDistance) || 0,
        pickup_window_start: new Date(start).toISOString(),
        pickup_window_end: new Date(end).toISOString(),
      },
      scenario: "success",
    });
  };

  const allocs = workflow?.allocations ?? [];
  const plainSummary = `${quantity || "?"} ${unit} of ${item || "surplus food"} from ${restaurant.name}, within ${maxDistance} km`;

  return (
    <Section id="match">
      <SectionHead
        eyebrow="03 · AI match engine"
        title="Three steps. The agents do the rest."
        lede="Tell us what's spare and where it can go. Watch each agent check in live below — nothing here is pre-filled, every result comes from the workflow."
      />
      <div className="split-12">
        <form
          className="panel panel-inner"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          aria-label="Surplus match request"
        >
          <div className="step-block">
            <div className="step-title">
              <span className="step-tag">1</span>
              <div>
                <strong>What's spare?</strong>
                <span style={{ display: "block" }}>The dish, the count, the unit.</span>
              </div>
            </div>
            <div className="field">
              <label htmlFor="me-restaurant">Source restaurant</label>
              <select id="me-restaurant" value={restaurantId} onChange={(e) => setRestaurantId(e.target.value)}>
                {restaurantOptions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}{r.address ? ` — ${r.address}` : ""}
                  </option>
                ))}
              </select>
              {LIVE_MODE ? (
                <span className="hint">{liveError ?? "Live backend registry · new requests create a real surplus lot."}</span>
              ) : null}
            </div>
            <div className="grid-2">
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="me-item">Surplus item</label>
                <input id="me-item" value={item} onChange={(e) => setItem(e.target.value)} placeholder="Chicken Dum Biryani" />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="me-qty">Quantity</label>
                <input id="me-qty" inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
            </div>
            <div className="field" style={{ marginBottom: 0, marginTop: 14 }}>
              <label htmlFor="me-unit">Unit</label>
              <input id="me-unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="meals" />
            </div>
          </div>

          <div className="step-block">
            <div className="step-title">
              <span className="step-tag">2</span>
              <div>
                <strong>Where can it go?</strong>
                <span style={{ display: "block" }}>Distance limit and pickup window.</span>
              </div>
            </div>
            <div className="field">
              <label htmlFor="me-dist">Max distance: {maxDistance} km</label>
              <input id="me-dist" type="range" min={1} max={25} value={maxDistance} onChange={(e) => setMaxDistance(e.target.value)} className="scrubber" />
            </div>
            <div className="grid-2">
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="me-start">Pickup from</label>
                <input id="me-start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="me-end">Pickup until</label>
                <input id="me-end" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="step-block" style={{ borderColor: "rgba(255,92,108,0.4)" }}>
            <div className="step-title">
              <span className="step-tag">3</span>
              <div>
                <strong>Fire the workflow</strong>
                <span style={{ display: "block" }}>{plainSummary}.</span>
              </div>
            </div>
            {formError ? <p className="err" role="alert" style={{ color: "var(--red)", fontSize: 13 }}>{formError}</p> : null}
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
              {loading ? <Loader2 size={16} aria-hidden="true" className="spin" /> : <Send size={16} aria-hidden="true" />}
              {loading ? "Matching — agents working…" : "Submit match request"}
            </button>
            <p className="hint mono" style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 10, marginBottom: 0 }}>
              POST /api/foodbridge/match · labeled demo adapter when no backend is reachable.
            </p>
          </div>
        </form>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="panel panel-inner">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <strong style={{ color: "var(--ink-0)" }}>What happens next</strong>
              <span style={{ marginLeft: "auto" }}>
                {workflow ? <WorkflowBadge status={workflow.status} /> : <span className="badge b-grey">awaiting request</span>}
              </span>
            </div>
            <div className="pipeline" aria-label="Agent pipeline progress">
              {AGENT_ORDER.map((a) => {
                const done = agentDone(a);
                const active = agentActive(a);
                return (
                  <div key={a} className={`pipe-node${done ? " done" : ""}${active ? " active" : ""}`}>
                    <span className="pd">
                      {done ? <Check size={13} aria-hidden="true" /> : active ? <Loader2 size={13} aria-hidden="true" /> : <AgentIcon agent={a} size={12} />}
                    </span>
                    <span className="pl">{PIPELINE_LABEL[a]}</span>
                  </div>
                );
              })}
            </div>
            {!workflow ? (
              <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 0 }}>
                Each stage lights up the moment its agent reports in — Detect first, Verify last.
              </p>
            ) : null}
          </div>

          <div className="panel panel-inner" aria-live="polite">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <strong style={{ color: "var(--ink-0)" }}>Allocation results</strong>
              <span style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                {source === "demo" ? <span className="badge b-violet">demo data</span> : null}
                {workflow ? <WorkflowBadge status={workflow.status} /> : null}
              </span>
            </div>
            {error && (!workflow || workflow.agentEvents.length === 0) ? (
              <Notice tone="red" title={error.message} code={error.code}>
                {error.detail ? <div>{error.detail}</div> : null}
              </Notice>
            ) : null}
            {!workflow || allocs.length === 0 ? (
              <EmptyState
                title={
                  !workflow
                    ? "No match request yet"
                    : workflow.status === "queued" || workflow.status === "running"
                      ? "Match in progress — follow the pipeline above"
                      : workflow.status === "empty"
                        ? "No compatible destination found"
                        : workflow.status === "failed"
                          ? "Match failed"
                          : "No allocations"
                }
                body={
                  !workflow
                    ? "Complete the 3 steps on the left. Agents, connections, and results populate from live events."
                    : workflow.status === "queued" || workflow.status === "running"
                      ? "Agents are processing. Allocations appear here the moment the workflow reports them."
                      : workflow.status === "empty"
                        ? "No shelter satisfied the distance and pickup constraints. Widen the radius in step 2 or extend the window, then retry."
                        : workflow.status === "failed"
                          ? (workflow.error?.detail ?? workflow.error?.message ?? "See the timeline for diagnostics, then retry.")
                          : "This workflow produced no allocations."
                }
              />
            ) : (
              <div style={{ overflowX: "auto" }}>
                {workflow.status === "completed" ? (
                  <Notice tone="emerald" title={`All ${workflow.summary?.confirmedCount ?? allocs.length} allocation${allocs.length === 1 ? "" : "s"} placed and verified.`}>
                    {workflow.summary ? <span>{workflow.summary.mealsRescued} meals rescued in {(workflow.summary.matchDurationMs / 1000).toFixed(1)}s.</span> : null}
                  </Notice>
                ) : null}
                {workflow.status === "partial" ? (
                  <Notice tone="amber" title="Partly placed — one leg still pending.">
                    Confirmed routes stay highlighted; retry the pending leg from the control panel.
                  </Notice>
                ) : null}
                <table className="alloc-table">
                  <thead>
                    <tr>
                      <th scope="col">Allocation</th>
                      <th scope="col">Destination</th>
                      <th scope="col">Distance</th>
                      <th scope="col">ETA</th>
                      <th scope="col">Confidence</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocs.map((a) => (
                      <tr key={a.id}>
                      <td className="strong num">{a.quantity} {a.unit} · {a.item}</td>
                      <td>{a.destinationName}</td>
                      <td className="num">{a.distanceKm.toFixed(1)} km</td>
                      <td className="num">{a.etaMinutes > 0 ? `${a.etaMinutes} min` : "—"}</td>
                        <td className="num">{typeof a.confidence === "number" ? `${(a.confidence * 100).toFixed(0)}%` : "not reported"}</td>
                        <td>
                          <span className={`badge ${a.status === "confirmed" ? "b-emerald" : a.status === "pending" ? "b-amber" : "b-red"}`}>
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {workflow.summary?.summaryText ? (
                  <p className="mono" style={{ fontSize: 12.5, color: "var(--ink-1)", marginTop: 10, marginBottom: 0, borderLeft: "2px solid var(--ember)", paddingLeft: 10 }}>
                    {workflow.summary.summaryText}
                  </p>
                ) : null}
                {workflow.summary ? (
                  <p className="mono" style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 0, display: "flex", alignItems: "center", gap: 6 }}>
                    Matched in {(workflow.summary.matchDurationMs / 1000).toFixed(1)}s · updated {formatClock(workflow.updatedAt)}
                    <a href="#replay" style={{ color: "var(--ember)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      watch the replay <ArrowRight size={12} aria-hidden="true" />
                    </a>
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}

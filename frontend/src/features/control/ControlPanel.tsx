import { useEffect, useMemo, useState } from "react";
import { FlaskConical, Loader2, RotateCcw, ShieldAlert, Sparkles, Zap } from "lucide-react";
import { RESTAURANTS, previewMockMatch, DEMO_LABEL } from "../../data/mock-adapter";
import { LIVE_MODE } from "../../data/api-client";
import { parseCommand } from "../../data/nlparse";
import type { ScenarioKind } from "../../data/schemas";
import { useFoodlinkStore } from "../../store/useFoodlinkStore";
import { Section } from "../../components/Chrome";
import { Notice, SectionHead, WorkflowBadge } from "../../components/ui";

const SCENARIOS: Array<{ id: ScenarioKind; label: string; hint: string }> = [
  { id: "success", label: "Standard rescue", hint: "full Detect → Verify run" },
  { id: "partial", label: "Partial (delay)", hint: "one leg delayed, one pending" },
  { id: "empty", label: "No match", hint: "constraints match nothing" },
  { id: "failed", label: "Negotiation failure", hint: "windows stop overlapping" },
];

export function ControlPanel(): React.JSX.Element {
  const runMatch = useFoodlinkStore((s) => s.runMatch);
  const loading = useFoodlinkStore((s) => s.loading);
  const workflow = useFoodlinkStore((s) => s.workflow);
  const error = useFoodlinkStore((s) => s.error);
  const source = useFoodlinkStore((s) => s.source);
  const stale = useFoodlinkStore((s) => s.stale);
  const lastRequest = useFoodlinkStore((s) => s.lastRequest);
  const reset = useFoodlinkStore((s) => s.reset);
  const liveCatalog = useFoodlinkStore((s) => s.liveCatalog);
  const liveError = useFoodlinkStore((s) => s.liveError);
  const resetDemo = useFoodlinkStore((s) => s.resetDemo);
  const [resetting, setResetting] = useState(false);
  const [nlError, setNlError] = useState<string | null>(null);

  const restaurantOptions = liveCatalog
    ? liveCatalog.restaurants.map((r) => ({ id: r.id, name: r.name, address: r.address }))
    : RESTAURANTS;
  useEffect(() => {
    if (restaurantOptions.length > 0 && !restaurantOptions.some((o) => o.id === restaurantId)) {
      setRestaurantId(restaurantOptions[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveCatalog]);

  const [restaurantId, setRestaurantId] = useState(RESTAURANTS[0].id);
  const [item, setItem] = useState("Chicken Dum Biryani");
  const [quantity, setQuantity] = useState("32");
  const [maxDistance, setMaxDistance] = useState("8");
  const [scenario, setScenario] = useState<ScenarioKind>("success");
  const [confirmArmed, setConfirmArmed] = useState(false);
  const [dryRun, setDryRun] = useState(false);

  const preview = useMemo(() => {
    if (!dryRun) return null;
    try {
      return previewMockMatch({
        restaurant_id: restaurantId,
        surplus_items: [{ item: item || "surplus", quantity: Number(quantity) || 0, unit: "meals", expires_at: new Date().toISOString() }],
        constraints: {
          max_distance_km: Number(maxDistance) || 0,
          pickup_window_start: new Date().toISOString(),
          pickup_window_end: new Date(Date.now() + 3600000).toISOString(),
        },
        scenario,
        dry_run: true,
      });
    } catch {
      return null;
    }
  }, [dryRun, restaurantId, item, quantity, maxDistance, scenario]);

  const dispatch = async (): Promise<void> => {
    setConfirmArmed(false);
    const now = Date.now();
    await runMatch({
      restaurant_id: restaurantId,
      surplus_items: [
        { item: item.trim() || "surplus food", quantity: Number(quantity) || 0, unit: "meals", expires_at: new Date(now + 4 * 3600000).toISOString() },
      ],
      constraints: {
        max_distance_km: Number(maxDistance) || 0,
        pickup_window_start: new Date(now + 30 * 60000).toISOString(),
        pickup_window_end: new Date(now + 4 * 3600000).toISOString(),
      },
      scenario,
    });
  };

  const retry = async (): Promise<void> => {
    if (lastRequest) await runMatch(lastRequest);
  };

  return (
    <Section id="control">
      <SectionHead
        eyebrow="11 · AI control panel"
        title="Launch a workflow — safely."
        lede="Dispatching creates a real workflow run. Dry-run previews the allocation shape first; dispatch requires explicit confirmation."
      />
      <NLDispatch
        onApply={(p) => {
          // Resolve demo parser ids/names against the live registry when live.
          const hit =
            restaurantOptions.find((o) => o.id === p.restaurant_id) ??
            restaurantOptions.find((o) => o.name.toLowerCase().includes(p.restaurant_id.replace(/^r-/, "").replace(/-/g, " "))) ??
            (LIVE_MODE ? null : { id: p.restaurant_id, name: p.restaurant_id, address: "" });
          if (!hit) {
            setNlError(`Couldn't match "${p.restaurant_id}" to a live restaurant — pick one from the list below.`);
            return;
          }
          setNlError(null);
          setRestaurantId(hit.id);
          setItem(p.item);
          setQuantity(String(p.quantity));
          setMaxDistance(String(p.maxDistance));
        }}
      />
      {nlError ? <Notice tone="amber" title={nlError} /> : null}
      <div className="split-21" style={{ alignItems: "start" }}>
        <div className="panel panel-inner">
          <div className="grid-2">
            <div className="field">
              <label htmlFor="cp-source">Partner / source</label>
              <select id="cp-source" value={restaurantId} onChange={(e) => setRestaurantId(e.target.value)}>
                {restaurantOptions.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}{r.address ? ` — ${r.address}` : ""}</option>
                ))}
              </select>
              {LIVE_MODE ? (
                <span className="hint">{liveError ?? "Live backend registry · dispatch creates a real surplus lot."}</span>
              ) : null}
            </div>
            {LIVE_MODE ? (
              <div className="field">
                <label>Mode</label>
                <div><span className="badge b-emerald">live backend</span></div>
                <span className="hint">Demo scenarios and dry-runs are demo-adapter features — live runs execute the real six-agent workflow.</span>
              </div>
            ) : (
            <div className="field">
              <label htmlFor="cp-scenario">Scenario (demo adapter)</label>
              <select id="cp-scenario" value={scenario} onChange={(e) => setScenario(e.target.value as ScenarioKind)}>
                {SCENARIOS.map((s) => (
                  <option key={s.id} value={s.id}>{s.label} — {s.hint}</option>
                ))}
              </select>
              <span className="hint">Exercises success, partial, empty, and failure states end to end.</span>
            </div>
            )}
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="cp-item">Surplus item</label>
              <input id="cp-item" value={item} onChange={(e) => setItem(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="cp-qty">Quantity (meals)</label>
              <input id="cp-qty" inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="cp-dist">Max distance: {maxDistance} km</label>
            <input id="cp-dist" type="range" min={1} max={25} value={maxDistance} onChange={(e) => setMaxDistance(e.target.value)} className="scrubber" />
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
            {!LIVE_MODE ? (
              <button type="button" className="icon-btn" aria-pressed={dryRun} onClick={() => setDryRun(!dryRun)}>
                <FlaskConical size={15} aria-hidden="true" /> {dryRun ? "Hide dry-run" : "Dry-run preview"}
              </button>
            ) : null}
            {!confirmArmed ? (
              <button type="button" className="btn btn-primary" disabled={loading} onClick={() => setConfirmArmed(true)}>
                {loading ? <Loader2 size={16} aria-hidden="true" /> : <Zap size={16} aria-hidden="true" />}
                {loading ? "Dispatching…" : "Dispatch workflow"}
              </button>
            ) : (
              <span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }} role="group" aria-label="Confirm dispatch">
                <span className="badge b-amber"><ShieldAlert size={12} aria-hidden="true" /> confirm dispatch?</span>
                <button type="button" className="btn btn-primary btn-sm" disabled={loading} onClick={() => void dispatch()}>Confirm</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmArmed(false)}>Cancel</button>
              </span>
            )}
            <button type="button" className="icon-btn" disabled={loading || !lastRequest} onClick={() => void retry()} aria-label="Retry last request">
              <RotateCcw size={15} aria-hidden="true" /> Retry last
            </button>
            {LIVE_MODE ? (
              <button
                type="button"
                className="icon-btn"
                disabled={loading || resetting}
                onClick={() => {
                  setResetting(true);
                  resetDemo()
                    .catch(() => undefined)
                    .finally(() => setResetting(false));
                }}
                title="Restore the backend's seed lots (dev rehearsal)"
              >
                <RotateCcw size={15} aria-hidden="true" /> {resetting ? "Resetting…" : "Reset demo data"}
              </button>
            ) : null}
            <button type="button" className="btn btn-danger-ghost btn-sm" onClick={reset}>Reset board</button>
          </div>
          {!LIVE_MODE && dryRun && preview ? (
            <div className="notice n-cyan" style={{ marginTop: 14 }} role="status">
              <div>
                <strong style={{ color: "var(--ink-0)" }}>Dry-run preview (no workflow created)</strong>
                <div className="mono" style={{ fontSize: 12.5, marginTop: 6 }}>
                  {preview.allocations.length === 0
                    ? "This scenario yields no allocations."
                    : preview.allocations.map((a) => `${a.quantity} ${a.unit} → ${a.destinationName} (${a.distanceKm.toFixed(1)} km, ETA ${a.etaMinutes} min)`).join(" · ")}
                </div>
              </div>
            </div>
          ) : null}
          <p className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 0 }}>
            {LIVE_MODE ? "Live backend · dispatches consume real surplus lots." : DEMO_LABEL}
          </p>
        </div>

        <div className="panel panel-inner" aria-live="polite">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <strong style={{ color: "var(--ink-0)" }}>Dispatch status</strong>
            <span style={{ marginLeft: "auto" }}>{workflow ? <WorkflowBadge status={workflow.status} /> : <span className="badge b-grey">idle</span>}</span>
          </div>
          {loading ? <Notice tone="cyan" title="Workflow queued — agents spinning up." >The origin node pulses while the request enters the pipeline. No outcome is assumed.</Notice> : null}
          {error ? (
            <Notice tone="red" title={errorFriendlyTitle(error.code)} code={error.code}>
              <div>{error.message}</div>
              {error.detail ? <div style={{ marginTop: 4 }}>{error.detail}</div> : null}
              {LIVE_MODE && (error.code === "SURPLUS_ALREADY_ALLOCATED" || error.code === "SURPLUS_IN_PROGRESS") ? (
                <div style={{ marginTop: 8, fontSize: 13 }}>
                  This lot is consumed — rescue a fresh lot from the surplus board, or restore seed data:
                  <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                    <a className="btn btn-ghost btn-sm" href="#surplus">Open surplus board</a>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={resetting}
                      onClick={() => {
                        setResetting(true);
                        resetDemo()
                          .catch(() => undefined)
                          .finally(() => setResetting(false));
                      }}
                    >
                      {resetting ? "Resetting…" : "Reset demo data"}
                    </button>
                  </div>
                </div>
              ) : null}
              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                <button type="button" className="btn btn-ghost btn-sm" disabled={!lastRequest} onClick={() => void retry()}>Retry</button>
                <button type="button" className="btn btn-danger-ghost btn-sm" onClick={reset}>Dismiss</button>
              </div>
            </Notice>
          ) : null}
          {stale ? <Notice tone="amber" title="Showing last valid state (stale).">The refresh failed; preserved data may be out of date. Retry to re-sync.</Notice> : null}
          {workflow && !loading && !error ? (
            <div className="mono" style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
              <div>workflow: {workflow.id}</div>
              <div>events: {workflow.agentEvents.length} · allocations: {workflow.allocations.length}</div>
              <div>source: {source === "demo" ? "demo adapter" : "live backend"}</div>
              {workflow.error ? <div style={{ color: "var(--red)" }}>error: {workflow.error.code} — {workflow.error.message}</div> : null}
            </div>
          ) : null}
          {!workflow && !loading && !error ? (
            <p style={{ color: "var(--ink-2)", fontSize: 14, margin: 0 }}>
              No dispatch yet. Arm a scenario on the left, preview it dry, then confirm to run the full agent sequence.
            </p>
          ) : null}
        </div>
      </div>
    </Section>
  );
}

/** Manus-style plain-English dispatch: type a rescue order, get a structured request. */
function NLDispatch({
  onApply,
}: {
  onApply: (p: { restaurant_id: string; item: string; quantity: number; maxDistance: number }) => void;
}): React.JSX.Element {
  const [text, setText] = useState("");
  const parsed = useMemo(() => (text.trim() ? parseCommand(text) : null), [text]);
  const ready =
    parsed !== null &&
    parsed.errors.length === 0 &&
    parsed.restaurant_id !== undefined &&
    parsed.item !== undefined &&
    parsed.quantity !== undefined &&
    parsed.max_distance_km !== undefined;

  return (
    <div className="panel panel-inner" style={{ marginBottom: 20, borderColor: "rgba(56,189,248,0.4)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <Sparkles size={16} aria-hidden="true" style={{ color: "var(--indigo)" }} />
        <strong style={{ color: "var(--ink-0)" }}>Ask in plain English</strong>
        <span className="badge b-violet" style={{ marginLeft: "auto" }}>copilot</span>
      </div>
      <label className="sr-only" htmlFor="cp-nl">Describe the rescue in plain English</label>
      <input
        id="cp-nl"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='Try: “Rescue 30 biryani from Meghana within 5 km”'
        style={{
          width: "100%", background: "rgba(8,11,16,0.88)", border: "1px solid var(--hairline)",
          borderRadius: 10, color: "var(--ink-0)", fontSize: 14, padding: "12px 14px",
        }}
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        {[
          "Rescue 30 biryani from Meghana within 5 km",
          "40 croissants from Theobroma",
          "25 burgers at Truffles under 6 km",
        ].map((ex) => (
          <button key={ex} type="button" className="chip cool" onClick={() => setText(ex)}>
            {ex}
          </button>
        ))}
      </div>
      {parsed ? (
        <div style={{ marginTop: 12 }} aria-live="polite">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="badge b-ember">{parsed.quantity ?? "?"} × {parsed.item ?? "?"}</span>
            <span className="badge b-violet">{parsed.restaurantName ?? "?"}</span>
            <span className="badge b-cyan">{parsed.max_distance_km ?? "?"} km</span>
          </div>
          {parsed.notes.map((n) => (
            <p key={n} className="mono" style={{ fontSize: 12, color: "var(--ink-2)", margin: "8px 0 0" }}>· {n}</p>
          ))}
          {parsed.errors.map((e) => (
            <p key={e} role="alert" style={{ fontSize: 13, color: "var(--red)", margin: "8px 0 0" }}>· {e}</p>
          ))}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 10 }}
            disabled={!ready}
            onClick={() => {
              if (!ready) return;
              onApply({
                restaurant_id: parsed.restaurant_id as string,
                item: parsed.item as string,
                quantity: parsed.quantity as number,
                maxDistance: parsed.max_distance_km as number,
              });
              setText("");
            }}
          >
            <Zap size={14} aria-hidden="true" /> Use this request below
          </button>
        </div>
      ) : null}
    </div>
  );
}

function errorFriendlyTitle(code: string): string {
  if (code === "SURPLUS_ALREADY_ALLOCATED") return "Lot already allocated.";
  if (code === "SURPLUS_IN_PROGRESS") return "Match already in progress for this lot.";
  if (code === "TIMEOUT") return "Backend timed out.";
  if (code === "HTTP_404") return "Resource not found.";
  if (code === "HTTP_422" || code === "VALIDATION") return "Invalid request — check the form.";
  if (code === "HTTP_429") return "Rate limited — retry shortly.";
  if (code === "HTTP_500") return "Service failure.";
  if (code === "OFFLINE") return "You appear to be offline.";
  return "Dispatch failed.";
}

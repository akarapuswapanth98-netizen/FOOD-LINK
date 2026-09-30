import { useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, StepBack, StepForward, Flag, SkipBack, SkipForward } from "lucide-react";
import { useFoodlinkStore } from "../../store/useFoodlinkStore";
import { Section } from "../../components/Chrome";
import { AgentIcon, AGENT_NAMES, SectionHead, StatusDot, WorkflowBadge } from "../../components/ui";
import { compressedGap, formatClock } from "../../lib/format";
import { eventStatusToAgent } from "../../data/schemas";

/**
 * Event-driven negotiation replay with real-gap pacing, scrubber,
 * now-playing spotlight, decision-point jumps, and auto-follow.
 * Debugged: step 0 no longer previews event 1; scrubbing while a live
 * run streams no longer fights the auto-follow cursor.
 */
export function NegotiationReplay(): React.JSX.Element {
  const workflow = useFoodlinkStore((s) => s.workflow);
  const revealedCount = useFoodlinkStore((s) => s.revealedCount);
  const playing = useFoodlinkStore((s) => s.playing);
  const setPlaying = useFoodlinkStore((s) => s.setPlaying);
  const setRevealedCount = useFoodlinkStore((s) => s.setRevealedCount);
  const selectAgent = useFoodlinkStore((s) => s.selectAgent);

  const events = workflow?.agentEvents ?? [];
  const total = events.length;
  const current = revealedCount > 0 && total > 0 ? events[Math.min(revealedCount, total) - 1] : undefined;
  const currentRef = useRef<HTMLLIElement>(null);

  // Decision points: warnings, failures, and terminal verdicts.
  const decisions = events
    .map((e, i) => ({ e, i }))
    .filter(({ e }) =>
      e.status === "warning" ||
      e.status === "failed" ||
      e.type === "negotiation.agreed" ||
      e.type === "match.no_candidates" ||
      e.type === "handoff.verified",
    )
    .map(({ i }) => i);

  const jumpDecision = (dir: 1 | -1): void => {
    if (decisions.length === 0) return;
    const cursor = revealedCount - 1;
    const next =
      dir === 1
        ? decisions.find((d) => d >= cursor) ?? decisions[0]
        : [...decisions].reverse().find((d) => d < cursor) ?? decisions[decisions.length - 1];
    setRevealedCount(next + 1);
  };

  // Advance using compressed real gaps between event timestamps.
  useEffect(() => {
    if (!playing || !workflow) return;
    if (revealedCount >= total) {
      setPlaying(false);
      return;
    }
    if (revealedCount === 0) {
      const t = setTimeout(() => {
        useFoodlinkStore.setState({ revealedCount: 1 });
      }, 500);
      return () => clearTimeout(t);
    }
    const prev = events[revealedCount - 1];
    const next = events[revealedCount];
    // Guard: a live run may have replaced the event array mid-replay.
    if (!prev || !next) {
      setPlaying(false);
      return;
    }
    const delay = compressedGap(prev.timestamp, next.timestamp);
    const t = setTimeout(() => {
      const latest = useFoodlinkStore.getState().workflow?.agentEvents.length ?? 0;
      useFoodlinkStore.setState((s) => ({ revealedCount: Math.min(latest, s.revealedCount + 1) }));
    }, delay);
    return () => clearTimeout(t);
  }, [playing, revealedCount, total, workflow, events, setPlaying]);

  // Auto-follow the now-playing step.
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [revealedCount]);

  const startReplay = (): void => {
    if (total === 0) return;
    useFoodlinkStore.setState({ revealedCount: 0, playing: true });
  };

  return (
    <Section id="replay">
      <SectionHead
        eyebrow="04 · Agent negotiation replay"
        title="Replay exactly what the agents decided."
        lede="Scrub the real event timeline. Each step highlights the deciding agent in 3D and on the topology graph — with actual timestamps and clearly normalized pacing for long gaps."
      />
      <div className="panel panel-inner">
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
          <strong style={{ color: "var(--ink-0)" }}>Negotiation timeline</strong>
          <span style={{ marginLeft: "auto" }}>{workflow ? <WorkflowBadge status={workflow.status} /> : <span className="badge b-grey">no workflow</span>}</span>
        </div>
        {total === 0 ? (
          <p style={{ color: "var(--ink-2)", fontSize: 14 }}>
            No events yet. Run a match — the negotiation will be replayable here step by step.
          </p>
        ) : (
          <>
            {current ? (
              <div className="spotlight" aria-live="polite">
                <div className="mono" style={{ fontSize: 10.5, letterSpacing: "0.18em", color: "var(--ember)" }}>
                  NOW REPLAYING · STEP {revealedCount}/{total}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                  <span className="agent-ico">
                    <AgentIcon agent={current.agent} size={18} />
                  </span>
                  <div>
                    <div style={{ color: "var(--ink-0)", fontWeight: 600, fontSize: 15 }}>{current.message}</div>
                    <div className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>
                      {AGENT_NAMES[current.agent]} · {current.type} · {current.status} · {formatClock(current.timestamp)}
                    </div>
                  </div>
                </div>
                <div className="bar" aria-hidden="true">
                  <div style={{ width: `${(revealedCount / total) * 100}%` }} />
                </div>
              </div>
            ) : (
              <div className="spotlight">
                <div className="mono" style={{ fontSize: 10.5, letterSpacing: "0.18em", color: "var(--ink-3)" }}>
                  READY · 0/{total} STEPS REVEALED
                </div>
                <p style={{ color: "var(--ink-1)", fontSize: 14, margin: "8px 0 0" }}>
                  Press play — the negotiation replays with the real pacing between agent decisions.
                </p>
              </div>
            )}
            <div className="transport" role="group" aria-label="Replay controls">
              <button type="button" className="icon-btn" onClick={() => setRevealedCount(0)} disabled={revealedCount <= 0} aria-label="Back to start">
                <SkipBack size={15} aria-hidden="true" />
              </button>
              <button type="button" className="icon-btn" onClick={() => setRevealedCount(revealedCount - 1)} disabled={revealedCount <= 0} aria-label="Previous event">
                <StepBack size={15} aria-hidden="true" />
              </button>
              {playing ? (
                <button type="button" className="icon-btn" onClick={() => setPlaying(false)} aria-label="Pause replay">
                  <Pause size={15} aria-hidden="true" /> Pause
                </button>
              ) : (
                <button type="button" className="icon-btn" onClick={() => setPlaying(true)} disabled={revealedCount >= total} aria-label="Play replay">
                  <Play size={15} aria-hidden="true" /> Play
                </button>
              )}
              <button type="button" className="icon-btn" onClick={() => setRevealedCount(revealedCount + 1)} disabled={revealedCount >= total} aria-label="Next event">
                <StepForward size={15} aria-hidden="true" />
              </button>
              <button type="button" className="icon-btn" onClick={startReplay} aria-label="Replay from start">
                <RotateCcw size={15} aria-hidden="true" /> Replay
              </button>
              <button type="button" className="icon-btn" onClick={() => jumpDecision(-1)} disabled={decisions.length === 0} aria-label="Previous decision point">
                <Flag size={14} aria-hidden="true" /> Prev key moment
              </button>
              <button type="button" className="icon-btn" onClick={() => jumpDecision(1)} disabled={decisions.length === 0} aria-label="Next decision point">
                Next key moment <SkipForward size={14} aria-hidden="true" />
              </button>
              <span className="mono" style={{ fontSize: 12, color: "var(--ink-2)", marginLeft: "auto" }} aria-live="polite">
                step {revealedCount} / {total}
                {current ? ` · ${formatClock(current.timestamp)}` : ""}
              </span>
            </div>
            <label className="sr-only" htmlFor="replay-scrub">Scrub negotiation timeline</label>
            <input
              id="replay-scrub"
              type="range"
              className="scrubber"
              min={0}
              max={total}
              value={revealedCount}
              onChange={(e) => setRevealedCount(Number(e.target.value))}
            />
            <ol className="timeline-list" aria-label="Negotiation events">
              {events.map((e, i) => {
                const seen = i < revealedCount;
                const isCurrent = i === revealedCount - 1;
                const isDecision = decisions.includes(i);
                return (
                  <li
                    key={e.id}
                    ref={isCurrent ? currentRef : undefined}
                    className="timeline-item"
                    style={{ opacity: seen ? 1 : 0.38 }}
                    aria-current={isCurrent ? "step" : undefined}
                  >
                    <span className="timeline-rail">
                      <StatusDot status={eventStatusToAgent(e.status)} pulse={isCurrent} />
                    </span>
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          selectAgent(e.agent);
                          setRevealedCount(i + 1);
                        }}
                        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", font: "inherit" }}
                        aria-label={`Highlight ${e.agent}, ${e.message}`}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <AgentIcon agent={e.agent} size={15} />
                          <span className="timeline-msg">{e.message}</span>
                          {isDecision ? (
                            <span className="badge b-amber" style={{ fontSize: 9.5 }}>key moment</span>
                          ) : null}
                        </span>
                      </button>
                      <span className="timeline-meta">
                        <span>{e.agent} · {e.type} · {e.status}</span>
                        <span>{formatClock(e.timestamp)}</span>
                        {i > 0 ? <span>pacing ≈ {(compressedGap(events[i - 1].timestamp, e.timestamp) / 1000).toFixed(1)}s (normalized)</span> : <span>negotiation start</span>}
                      </span>
                      {isCurrent ? (
                        <span className="badge b-cyan" style={{ marginTop: 8 }}>now replaying</span>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </div>
    </Section>
  );
}

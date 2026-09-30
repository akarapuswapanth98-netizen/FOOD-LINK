import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useFoodlinkStore } from "../store/useFoodlinkStore";

interface TourStep {
  target: string;
  title: string;
  body: string;
  action?: () => void;
}

const STEPS: TourStep[] = [
  {
    target: "top",
    title: "The living network",
    body: "This is not a backdrop — every glow is workflow state. A demo rescue is resolving right now: cloche, AI core, house, scales, van, badge.",
  },
  {
    target: "network",
    title: "Meet the six agents",
    body: "Each agent exposes status, activity, and timestamps from real events. The Matching Agent is highlighted in 3D for you.",
    action: () => useFoodlinkStore.getState().selectAgent("matching"),
  },
  {
    target: "surplus",
    title: "Real food, real countdowns",
    body: "The surplus board lists live lots with ticking expiry clocks. Hit Rescue on any lot and the whole system reacts — try it after the tour.",
  },
  {
    target: "replay",
    title: "Replay the negotiation",
    body: "Scrub the exact agent decisions with real timestamps. The tour restarts playback so you can watch the scales level in 3D.",
    action: () => useFoodlinkStore.setState({ revealedCount: 0, playing: true }),
  },
  {
    target: "impact",
    title: "Measured, disclosed impact",
    body: "Meals, diverted weight, and CO₂ with the methodology printed next to the numbers — quotable for judges.",
  },
  {
    target: "control",
    title: "Your turn — break it",
    body: "Dispatch the partial, empty, and failure scenarios from the control panel. Every state has intentional UX. End of tour — good luck!",
  },
];

/** Guided judge-demo tour: scrolls, spotlights, and drives the live system. */
export function Tour({ onDone }: { onDone: () => void }): React.JSX.Element {
  const [i, setI] = useState(0);

  useEffect(() => {
    const step = STEPS[i];
    step.action?.();
    document.querySelectorAll(".tour-spot").forEach((el) => el.classList.remove("tour-spot"));
    const el = document.getElementById(step.target);
    if (el) {
      el.classList.add("tour-spot");
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onDone();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, onDone]);

  useEffect(
    () => () => {
      document.querySelectorAll(".tour-spot").forEach((el) => el.classList.remove("tour-spot"));
      useFoodlinkStore.setState({ playing: false });
    },
    [],
  );

  const step = STEPS[i];
  return (
    <div className="tour-card panel" role="dialog" aria-modal="false" aria-label={`Demo tour step ${i + 1} of ${STEPS.length}`}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="mono" style={{ fontSize: 11, letterSpacing: "0.18em", color: "var(--ember)" }}>
          JUDGE DEMO · {i + 1}/{STEPS.length}
        </span>
        <button type="button" className="icon-btn btn-sm" style={{ marginLeft: "auto", padding: 6 }} onClick={onDone} aria-label="End tour">
          <X size={14} aria-hidden="true" />
        </button>
      </div>
      <strong style={{ color: "var(--ink-0)", fontSize: 17, display: "block", marginTop: 8 }}>{step.title}</strong>
      <p style={{ fontSize: 14, color: "var(--ink-1)", margin: "6px 0 14px" }}>{step.body}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button type="button" className="icon-btn" disabled={i === 0} onClick={() => setI(i - 1)} aria-label="Previous step">
          <ArrowLeft size={14} aria-hidden="true" /> Back
        </button>
        {i < STEPS.length - 1 ? (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setI(i + 1)}>
            Next <ArrowRight size={14} aria-hidden="true" />
          </button>
        ) : (
          <button type="button" className="btn btn-primary btn-sm" onClick={onDone}>
            Finish tour
          </button>
        )}
        <span style={{ marginLeft: "auto", display: "flex", gap: 5 }} aria-hidden="true">
          {STEPS.map((s, k) => (
            <span key={s.target} className={`tour-dot${k === i ? " on" : ""}`} />
          ))}
        </span>
      </div>
    </div>
  );
}

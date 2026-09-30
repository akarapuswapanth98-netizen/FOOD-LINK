import { useEffect, useRef } from "react";
import { Pause, Play } from "lucide-react";
import { useFoodlinkStore } from "../store/useFoodlinkStore";

/** Scroll-triggered progress hairline (rAF-throttled, zero layout cost). */
export function ScrollProgress(): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const onScroll = (): void => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const h = document.documentElement;
        const max = h.scrollHeight - h.clientHeight;
        const p = max > 0 ? h.scrollTop / max : 0;
        if (ref.current) ref.current.style.transform = `scaleX(${p.toFixed(4)})`;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div className="scroll-progress" aria-hidden="true">
      <div ref={ref} />
    </div>
  );
}


export function Section({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section id={id} className="block" aria-label={id}>
      <div className="wrap">{children}</div>
    </section>
  );
}

export function Footer(): React.JSX.Element {
  const motionPaused = useFoodlinkStore((s) => s.motionPaused);
  const setMotionPaused = useFoodlinkStore((s) => s.setMotionPaused);
  const forceFallback = useFoodlinkStore((s) => s.forceFallback);
  const setForceFallback = useFoodlinkStore((s) => s.setForceFallback);
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="grid-2">
          <div>
            <div className="wordmark" style={{ marginBottom: 12 }}>
              <img
                src="/brand/foodlink-logo.svg"
                alt="FOODLINK AI — Real-Time Food Rescue Infrastructure"
                className="brand-img"
                height={32}
              />
            </div>
            <p style={{ maxWidth: "52ch" }}>
              Real-time multi-agent food rescue coordination: Detect → Match → Negotiate → Hand
              Off → Deliver → Verify. The 3D layer visualizes live workflow state; all operational
              content is equally available as text.
            </p>
          </div>
          <div>
            <p style={{ fontWeight: 600, color: "var(--ink-1)", marginBottom: 10 }}>Display controls</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="icon-btn" aria-pressed={motionPaused} onClick={() => setMotionPaused(!motionPaused)}>
                {motionPaused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
                {motionPaused ? "Resume motion" : "Pause motion"}
              </button>
              <button type="button" className="icon-btn" aria-pressed={forceFallback} onClick={() => setForceFallback(!forceFallback)}>
                {forceFallback ? "Enable 3D view" : "Use text-only network"}
              </button>
            </div>
            <p style={{ marginTop: 12 }}>
              Keyboard: Tab to navigate, Enter to select agents and controls. Honors
              prefers-reduced-motion. CO₂ figures are estimates — see Impact for methodology.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

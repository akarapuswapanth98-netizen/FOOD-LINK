import { Suspense, lazy, useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, Orbit, Play, Zap } from "lucide-react";
import { NetworkFallback } from "../../components/NetworkFallback";
import { useFoodlinkStore, useRevealedEvents } from "../../store/useFoodlinkStore";
import { allAgentDisplays } from "../../lib/agents";
import { timeAgo } from "../../lib/format";
import { DEMO_LABEL } from "../../data/mock-adapter";

// Code-split: the Three.js scene loads as a separate chunk, and text-only
// (no-WebGL) users never download it.
const CanvasRoot = lazy(() =>
  import("../../scene/CanvasRoot").then((m) => ({ default: m.CanvasRoot })),
);

const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.35 + i * 0.14, duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export function Hero({ noWebGL, onTour }: { noWebGL: boolean; onTour: () => void }): React.JSX.Element {
  const reduce = useReducedMotion();
  const workflow = useFoodlinkStore((s) => s.workflow);
  const loading = useFoodlinkStore((s) => s.loading);
  const source = useFoodlinkStore((s) => s.source);
  const explore3D = useFoodlinkStore((s) => s.explore3D);
  const setExplore3D = useFoodlinkStore((s) => s.setExplore3D);
  const stageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  // Cursor spotlight tracking (fine pointers only, never on touch/reduced motion).
  useEffect(() => {
    if (reduce || !window.matchMedia("(pointer: fine)").matches) return;
    const stage = stageRef.current;
    const glow = glowRef.current;
    if (!stage || !glow) return;
    let raf = 0;
    let x = -999;
    let y = -999;
    const paint = (): void => {
      raf = 0;
      glow.style.background = `radial-gradient(340px circle at ${x}px ${y}px, rgba(255,92,108,0.10), transparent 70%)`;
    };
    const onMove = (e: PointerEvent): void => {
      const r = stage.getBoundingClientRect();
      x = e.clientX - r.left;
      y = e.clientY - r.top;
      if (!raf) raf = requestAnimationFrame(paint);
    };
    stage.addEventListener("pointermove", onMove);
    return () => {
      stage.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduce]);

  // Scroll-triggered hero parallax: content lifts and dissolves as you leave.
  useEffect(() => {
    if (reduce) return;
    const el = contentRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = (): void => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = Math.min(1, window.scrollY / window.innerHeight);
        el.style.transform = `translateY(${(y * 120).toFixed(1)}px)`;
        el.style.opacity = (1 - y * 0.85).toFixed(3);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduce]);
  const lastUpdated = useFoodlinkStore((s) => s.lastUpdated);
  const stale = useFoodlinkStore((s) => s.stale);
  const revealed = useRevealedEvents();
  const displays = allAgentDisplays(revealed);
  const activeAgents = displays.filter(
    (d) => d.status === "processing" || d.status === "listening",
  ).length;

  const stateText = loading
    ? "QUEUED / STARTING"
    : workflow
      ? workflow.status.toUpperCase().replace("_", " ")
      : "IDLE — STANDBY";

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
      <div className="hero-stage" id="top" ref={stageRef}>
      {!noWebGL ? (
        <Suspense fallback={<div className="hero-canvas" style={{ background: "#04070d" }} />}>
          <CanvasRoot className="hero-canvas" />
        </Suspense>
      ) : (
        <div className="hero-canvas" style={{ background: "radial-gradient(60% 50% at 50% 40%, #16202f, #080b10)" }} />
      )}
      <div className="hero-scrim" />
      <div ref={glowRef} className="hero-glow" aria-hidden="true" />
      <div className="hero-content" ref={contentRef}>
        <div className="wrap">
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
            <span className="eyebrow">{greeting} · rescue window open</span>
          </motion.div>
          <motion.h1 variants={fadeUp} initial="hidden" animate="show" custom={1}>
            Move surplus food <span className="accent serif">where it matters.</span>
          </motion.h1>
          <motion.p className="hero-sub" variants={fadeUp} initial="hidden" animate="show" custom={2}>
            Six specialized AI agents coordinate supply, demand, negotiation, delivery, and
            verification — Detect → Match → Negotiate → Hand Off → Deliver → Verify. Watch a
            live rescue workflow resolve across the network below.
          </motion.p>
          <motion.div className="hero-ctas" variants={fadeUp} initial="hidden" animate="show" custom={3}>
            <Magnetic reduce={reduce ?? false}>
              <a className="btn btn-primary" href="#control">
                <Zap size={16} aria-hidden="true" /> Run a match
              </a>
            </Magnetic>
            <a className="btn btn-ghost" href="#network">
              <ArrowDown size={16} aria-hidden="true" /> Explore the network
            </a>
            <button type="button" className="btn btn-ghost" onClick={onTour}>
              <Play size={16} aria-hidden="true" /> Judge demo tour
            </button>
          </motion.div>
          <motion.div
            className="hero-statusbar"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={4}
            role="status"
            aria-label="Live system status"
          >
            <span className="status-chip">
              <span className="k">Workflow</span>
              <span className="v">{stateText}</span>
            </span>
            <span className="status-chip">
              <span className="k">Active agents</span>
              <span className="v num">{activeAgents} / 6</span>
            </span>
            <span className="status-chip">
              <span className="k">Events</span>
              <span className="v num">{revealed.length}</span>
            </span>
            <span className="status-chip">
              <span className="k">Source</span>
              <span className="v">{source === "live" ? "live backend" : source === "demo" ? "demo adapter" : "—"}</span>
            </span>
            <span className="status-chip">
              <span className="k">Updated</span>
              <span className="v">{timeAgo(lastUpdated)}{stale ? " (stale)" : ""}</span>
            </span>
            {!noWebGL ? (
              <button
                type="button"
                className="status-chip"
                aria-pressed={explore3D}
                onClick={() => setExplore3D(!explore3D)}
                title="Take over the camera: drag to orbit, scroll to zoom"
                style={{ cursor: "pointer", borderColor: explore3D ? "var(--ember)" : undefined, fontFamily: "inherit" }}
              >
                <Orbit size={13} aria-hidden="true" style={{ color: explore3D ? "var(--ember)" : "var(--ink-3)" }} />
                <span className="k">3D</span>
                <span className="v">{explore3D ? "exploring — drag me" : "drag to explore"}</span>
              </button>
            ) : null}
          </motion.div>
          {noWebGL ? (
            <div style={{ marginTop: 22, maxWidth: 720 }}>
              <NetworkFallback />
            </div>
          ) : null}
          {source === "demo" ? (
            <p className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 14 }}>
              {DEMO_LABEL}
            </p>
          ) : null}
          <div className="ticker" aria-label="Latest agent events">
            {revealed.length === 0 ? (
              <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>
                Awaiting first agent events — demo workflow starting…
              </span>
            ) : (
              <div className="ticker-track" aria-hidden="true">
                {[...revealed.slice(-6), ...revealed.slice(-6)].map((e, k) => (
                  <span key={`${e.id}-${k}`} className="mono" style={{ fontSize: 12, color: "var(--ink-2)" }}>
                    <strong style={{ color: e.status === "failed" ? "var(--red)" : e.status === "warning" ? "var(--amber)" : "var(--ember)" }}>
                      {e.agent}
                    </strong>{" "}
                    · {e.message}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
      <div className="marquee" aria-label="Partner cuisines on tonight's rescue menu">
        <div className="marquee-track" aria-hidden="true">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((m, k) => (
            <span key={k} className="marquee-item">
              <b>//</b> {m}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

const MARQUEE_ITEMS = [
  "MEGHANA FOODS · ANDHRA BIRYANI",
  "TRUFFLES · BURGERS",
  "ADYAR ANANDA BHAVAN · SOUTH MEALS",
  "THEOBROMA · BAKERY",
  "EATFIT · BUDDHA BOWLS",
  "DETECT → MATCH → NEGOTIATE → VERIFY",
  "TONIGHT'S RESCUE WINDOW IS OPEN",
];

/** Magnetic hover pull for the primary CTA (fine pointers only). */
function Magnetic({ children, reduce }: { children: React.ReactNode; reduce: boolean }): React.JSX.Element {
  const ref = useRef<HTMLSpanElement>(null);
  const tracking = !reduce && typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;
  return (
    <span
      ref={ref}
      style={{ display: "inline-flex", transition: "transform 0.22s ease-out" }}
      onMouseMove={(e) => {
        if (!tracking || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) / r.width;
        const y = (e.clientY - r.top - r.height / 2) / r.height;
        ref.current.style.transform = `translate(${(x * 7).toFixed(1)}px, ${(y * 7).toFixed(1)}px)`;
      }}
      onMouseLeave={() => {
        if (ref.current) ref.current.style.transform = "translate(0,0)";
      }}
    >
      {children}
    </span>
  );
}

import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  UtensilsCrossed,
  Network,
  Zap,
  Activity,
  BarChart3,
  Clock,
  Leaf,
  SlidersHorizontal,
  Search,
  Bell,
  HelpCircle,
  Menu,
  X,
  ChevronDown,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Pause,
  Play,
} from "lucide-react";
import { useFoodlinkStore } from "../store/useFoodlinkStore";
import { statusLabel } from "../data/schemas";
import { formatClock } from "../lib/format";

const NAV: Array<{ id: string; label: string; icon: typeof LayoutDashboard }> = [
  { id: "top", label: "Dashboard", icon: LayoutDashboard },
  { id: "surplus", label: "Surplus Board", icon: UtensilsCrossed },
  { id: "network", label: "Agent Network", icon: Network },
  { id: "match", label: "Match Engine", icon: Zap },
  { id: "operations", label: "Operations", icon: Activity },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "timeline", label: "Timeline", icon: Clock },
  { id: "impact", label: "Impact", icon: Leaf },
  { id: "control", label: "Control Panel", icon: SlidersHorizontal },
];

function go(id: string): void {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Application shell: sidebar navigation, command header with live search,
 * exception notifications, and operator profile — all wired to real
 * workflow state.
 */
export function Shell({ children, onTour }: { children: React.ReactNode; onTour: () => void }): React.JSX.Element {
  const [drawer, setDrawer] = useState(false);
  const [active, setActive] = useState("top");
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [q, setQ] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);

  const workflow = useFoodlinkStore((s) => s.workflow);
  const loading = useFoodlinkStore((s) => s.loading);
  const source = useFoodlinkStore((s) => s.source);
  const motionPaused = useFoodlinkStore((s) => s.motionPaused);
  const setMotionPaused = useFoodlinkStore((s) => s.setMotionPaused);
  const forceFallback = useFoodlinkStore((s) => s.forceFallback);
  const setForceFallback = useFoodlinkStore((s) => s.setForceFallback);
  const reset = useFoodlinkStore((s) => s.reset);

  // Active-section tracking for nav highlight.
  useEffect(() => {
    const els = NAV.map((n) => document.getElementById(n.id)).filter((el): el is HTMLElement => el !== null);
    if (els.length === 0 || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      { rootMargin: "-35% 0px -55% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Close dropdowns on outside click / Escape.
  useEffect(() => {
    const onDown = (e: PointerEvent): void => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setQ("");
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        setNotifOpen(false);
        setProfileOpen(false);
        setQ("");
        setDrawer(false);
      }
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const events = workflow?.agentEvents ?? [];
  const exceptions = events.filter((e) => e.status === "warning" || e.status === "failed");
  const feed = [...events].slice(-6).reverse();
  const statusText = loading ? "Starting…" : workflow ? statusLabel(workflow.status) : "Standby";
  const matches = q.trim() ? NAV.filter((n) => n.label.toLowerCase().includes(q.trim().toLowerCase())) : [];

  const nav = (
    <>
      <a className="wordmark side-wordmark" href="#top" aria-label="FOODLINK AI home" onClick={() => setDrawer(false)}>
        <img
          src="/brand/foodlink-logo.svg"
          alt="FOODLINK AI — Real-Time Food Rescue Infrastructure"
          className="brand-img"
          height={40}
        />
      </a>
      <nav className="side-nav" aria-label="Primary">
        {NAV.map((n) => {
          const Icon = n.icon;
          const on = active === n.id;
          return (
            <a
              key={n.id}
              href={`#${n.id}`}
              className={`side-link${on ? " active" : ""}`}
              aria-current={on ? "page" : undefined}
              onClick={(e) => {
                e.preventDefault();
                go(n.id);
                setDrawer(false);
              }}
            >
              <Icon size={17} aria-hidden="true" />
              {n.label}
              {on ? <span className="side-glow" aria-hidden="true" /> : null}
            </a>
          );
        })}
      </nav>
      <div className="side-profile">
        <span className="avatar" aria-hidden="true">OC</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", color: "var(--ink-0)", fontWeight: 600, fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            Ops Coordinator
          </span>
          <span className="mono" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: "var(--ink-3)" }}>
            <span className={`dot ${workflow && workflow.status !== "completed" ? "ember pulse" : "emerald"}`} aria-hidden="true" />
            {source === "live" ? "live backend" : source === "demo" ? "demo adapter" : "standby"}
          </span>
        </span>
      </div>
    </>
  );

  return (
    <div className="shell">
      <a className="skip-link" href="#main">Skip to main content</a>
      <aside className={`sidebar${drawer ? " open" : ""}`} aria-label="Sidebar">
        <button type="button" className="hamburger side-close" aria-label="Close menu" onClick={() => setDrawer(false)}>
          <X size={18} aria-hidden="true" />
        </button>
        {nav}
      </aside>
      {drawer ? <div className="drawer-scrim" aria-hidden="true" onClick={() => setDrawer(false)} /> : null}

      <div className="main-col">
        <header className="topheader">
          <button type="button" className="hamburger ham-show" aria-label="Open menu" onClick={() => setDrawer(true)}>
            <Menu size={18} aria-hidden="true" />
          </button>
          <div className="hsearch" ref={searchRef}>
            <Search size={15} aria-hidden="true" />
            <label className="sr-only" htmlFor="shell-search">Jump to section</label>
            <input
              id="shell-search"
              type="search"
              placeholder="Jump to Surplus, Replay, Impact…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && matches.length > 0) {
                  go(matches[0].id);
                  setQ("");
                }
              }}
              autoComplete="off"
            />
            {matches.length > 0 ? (
              <div className="hsearch-results" role="listbox" aria-label="Section matches">
                {matches.map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="option"
                      aria-selected={false}
                      onClick={() => {
                        go(m.id);
                        setQ("");
                      }}
                    >
                      <Icon size={14} aria-hidden="true" /> {m.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="hact">
            <span className="status-pill hstatus" role="status" aria-label={`System status: ${statusText}`}>
              <span className={`dot ${loading ? "ember pulse" : !workflow ? "grey" : workflow.status === "completed" ? "emerald" : workflow.status === "running" || workflow.status === "queued" ? "ember pulse" : workflow.status === "partial" || workflow.status === "empty" ? "amber" : "red"}`} aria-hidden="true" />
              {statusText}
            </span>
            <div style={{ position: "relative" }}>
              <button
                type="button"
                className="hicon"
                aria-label={`Notifications, ${exceptions.length} exceptions`}
                aria-expanded={notifOpen}
                onClick={() => {
                  setNotifOpen(!notifOpen);
                  setProfileOpen(false);
                }}
              >
                <Bell size={17} aria-hidden="true" />
                {exceptions.length > 0 ? <span className="hbadge" aria-hidden="true">{exceptions.length}</span> : null}
              </button>
              {notifOpen ? (
                <div className="hdrop" role="menu" aria-label="Notifications">
                  <p className="hdrop-title">Operational alerts</p>
                  {feed.length === 0 ? (
                    <p className="hdrop-empty">No events yet — run a match to populate this feed.</p>
                  ) : (
                    feed.map((e) => (
                      <div key={e.id} className="hdrop-item">
                        {e.status === "failed" ? (
                          <XCircle size={15} aria-hidden="true" style={{ color: "var(--red)", flex: "none" }} />
                        ) : e.status === "warning" ? (
                          <AlertTriangle size={15} aria-hidden="true" style={{ color: "var(--amber)", flex: "none" }} />
                        ) : (
                          <CheckCircle2 size={15} aria-hidden="true" style={{ color: "var(--leaf)", flex: "none" }} />
                        )}
                        <span>
                          <span style={{ display: "block", color: "var(--ink-0)", fontSize: 12.5 }}>{e.message}</span>
                          <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)" }}>{e.agent} · {formatClock(e.timestamp)}</span>
                        </span>
                      </div>
                    ))
                  )}
                  <a href="#timeline" onClick={() => setNotifOpen(false)}>Open full timeline →</a>
                </div>
              ) : null}
            </div>
            <button type="button" className="hicon" aria-label="Take the guided demo tour" title="Guided demo tour" onClick={onTour}>
              <HelpCircle size={17} aria-hidden="true" />
            </button>
            <div style={{ position: "relative" }}>
              <button
                type="button"
                className="hprofile"
                aria-expanded={profileOpen}
                aria-label="Operator profile menu"
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNotifOpen(false);
                }}
              >
                <span className="avatar sm" aria-hidden="true">OC</span>
                <span className="hname">Ops Coordinator <ChevronDown size={13} aria-hidden="true" /></span>
              </button>
              {profileOpen ? (
                <div className="hdrop" role="menu" aria-label="Profile">
                  <p className="hdrop-title">Signed in as<br /><strong style={{ color: "var(--ink-0)" }}>Ops Coordinator</strong></p>
                  <button type="button" onClick={() => setMotionPaused(!motionPaused)} role="menuitem">
                    {motionPaused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
                    {motionPaused ? "Resume motion" : "Pause motion"}
                  </button>
                  <button type="button" onClick={() => setForceFallback(!forceFallback)} role="menuitem">
                    {forceFallback ? "Enable 3D view" : "Use text-only network"}
                  </button>
                  <button type="button" onClick={() => { onTour(); setProfileOpen(false); }} role="menuitem">
                    Guided demo tour
                  </button>
                  <button type="button" onClick={() => { reset(); setProfileOpen(false); }} role="menuitem">
                    Reset board
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

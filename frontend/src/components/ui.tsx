import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Store,
  Cpu,
  HeartHandshake,
  MessagesSquare,
  Truck,
  ShieldCheck,
  Info,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import type { AgentKind, AgentStatus, WorkflowStatus } from "../data/schemas";
import { statusLabel } from "../data/schemas";
import { formatClock } from "../lib/format";

export const AGENT_ICONS: Record<AgentKind, typeof Store> = {
  restaurant: Store,
  matching: Cpu,
  shelter: HeartHandshake,
  negotiation: MessagesSquare,
  logistics: Truck,
  verification: ShieldCheck,
};

export const AGENT_NAMES: Record<AgentKind, string> = {
  restaurant: "Restaurant Agent",
  matching: "Matching Agent",
  shelter: "Shelter Agent",
  negotiation: "Negotiation Agent",
  logistics: "Logistics Agent",
  verification: "Verification Agent",
};

const STATUS_DOT: Record<AgentStatus, string> = {
  idle: "grey",
  listening: "cyan",
  processing: "cyan",
  waiting: "amber",
  completed: "emerald",
  warning: "amber",
  failed: "red",
};

export function AgentIcon({ agent, size = 18, color }: { agent: AgentKind; size?: number; color?: string }): React.JSX.Element {
  const Icon = AGENT_ICONS[agent];
  return <Icon size={size} color={color} aria-hidden="true" />;
}

export function StatusDot({ status, pulse = false }: { status: AgentStatus; pulse?: boolean }): React.JSX.Element {
  const active = status === "processing" || status === "listening";
  return (
    <span
      className={`dot ${STATUS_DOT[status]}${pulse && active ? " pulse" : ""}`}
      role="img"
      aria-label={`status: ${status}`}
    />
  );
}

export function WorkflowBadge({ status }: { status: WorkflowStatus }): React.JSX.Element {
  const cls =
    status === "completed"
      ? "b-emerald"
      : status === "running" || status === "queued"
        ? "b-cyan"
        : status === "partial" || status === "empty"
          ? "b-amber"
          : "b-red";
  return <span className={`badge ${cls}`}>{statusLabel(status)}</span>;
}

export function SectionHead({
  eyebrow,
  title,
  lede,
}: {
  eyebrow: string;
  title: string;
  lede: string;
}): React.JSX.Element {
  const reduce = useReducedMotion();
  const inner = (
    <>
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{lede}</p>
    </>
  );
  if (reduce) return <div className="section-head">{inner}</div>;
  return (
    <motion.div
      className="section-head"
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      {inner}
    </motion.div>
  );
}

export function Metric({
  value,
  label,
  sub,
}: {
  value: string;
  label: string;
  sub?: string;
}): React.JSX.Element {
  return (
    <div className="panel metric card-hover">
      <div className="mv">{value}</div>
      <div className="mk">{label}</div>
      {sub ? <div className="ms">{sub}</div> : null}
    </div>
  );
}

export function Notice({
  tone,
  title,
  children,
  code,
}: {
  tone: "amber" | "red" | "emerald" | "cyan";
  title: string;
  children?: ReactNode;
  code?: string;
}): React.JSX.Element {
  const Icon =
    tone === "red" ? XCircle : tone === "amber" ? AlertTriangle : tone === "emerald" ? CheckCircle2 : Info;
  return (
    <div className={`notice n-${tone}`} role={tone === "red" ? "alert" : "status"}>
      <Icon size={18} aria-hidden="true" style={{ flex: "none", marginTop: 2 }} />
      <div>
        <strong style={{ color: "var(--ink-0)" }}>{title}</strong>
        {children ? <div style={{ marginTop: 4 }}>{children}</div> : null}
        {code ? <div className="mono-code mono" style={{ marginTop: 6 }}>code: {code}</div> : null}
      </div>
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }): React.JSX.Element {
  return (
    <div className="panel panel-inner" style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <Clock size={18} aria-hidden="true" style={{ color: "var(--ink-3)", flex: "none", marginTop: 2 }} />
      <div>
        <strong style={{ color: "var(--ink-0)" }}>{title}</strong>
        <div style={{ color: "var(--ink-2)", fontSize: 14, marginTop: 4 }}>{body}</div>
      </div>
    </div>
  );
}

export function LastUpdated({ iso, stale }: { iso: string | null; stale: boolean }): React.JSX.Element {
  return (
    <span className="status-chip" title={iso ?? "no updates yet"}>
      <span className="k">Updated</span>
      <span className="v">{iso ? formatClock(iso) : "—"}</span>
      {stale ? <span className="badge b-amber">stale</span> : null}
    </span>
  );
}

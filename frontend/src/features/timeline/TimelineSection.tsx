import { useEffect, useRef, useState } from "react";
import { ArrowDownToLine, Check, ChevronDown, Copy, Download, Search } from "lucide-react";
import { AGENT_ORDER } from "../../data/schemas";
import type { AgentEvent, AgentKind, EventStatus } from "../../data/schemas";
import { useFoodlinkStore } from "../../store/useFoodlinkStore";
import { Section } from "../../components/Chrome";
import { AgentIcon, AGENT_NAMES, SectionHead, StatusDot } from "../../components/ui";
import { formatClock, formatDateTime, timeAgo } from "../../lib/format";
import { eventStatusToAgent } from "../../data/schemas";

type Severity = "all" | EventStatus;

function toCSV(rows: AgentEvent[]): string {
  const head = "id,workflow,agent,type,status,message,timestamp";
  const esc = (v: string): string => `"${v.replace(/"/g, '""')}"`;
  return [
    head,
    ...rows.map((e) =>
      [e.id, e.workflowId, e.agent, e.type, e.status, e.message, e.timestamp].map(esc).join(","),
    ),
  ].join("\n");
}

/**
 * Mission log: searchable, filterable, follow-live event stream with
 * relative timestamps, per-event JSON copy, and CSV export.
 */
export function TimelineSection(): React.JSX.Element {
  const workflow = useFoodlinkStore((s) => s.workflow);
  const [agentFilter, setAgentFilter] = useState<"all" | AgentKind>("all");
  const [severity, setSeverity] = useState<Severity>("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [follow, setFollow] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 2000);
    return () => clearInterval(t);
  }, []);

  const all = workflow?.agentEvents ?? [];
  const q = query.trim().toLowerCase();
  const events = all.filter(
    (e) =>
      (agentFilter === "all" || e.agent === agentFilter) &&
      (severity === "all" || e.status === severity) &&
      (!q || `${e.message} ${e.type} ${e.agent}`.toLowerCase().includes(q)),
  );

  const warnCount = all.filter((e) => e.status === "warning").length;
  const failCount = all.filter((e) => e.status === "failed").length;

  // Follow-live: keep the newest event in view as runs stream in.
  useEffect(() => {
    if (follow) endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [all.length, follow]);

  const copyJSON = async (e: AgentEvent): Promise<void> => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(e, null, 2));
      setCopiedId(e.id);
      setTimeout(() => setCopiedId((c) => (c === e.id ? null : c)), 1600);
    } catch {
      setCopiedId(null);
    }
  };

  const exportCSV = (): void => {
    if (events.length === 0) return;
    const blob = new Blob([toCSV(events)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `foodlink-timeline-${workflow?.id ?? "empty"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Section id="timeline">
      <SectionHead
        eyebrow="07 · Agent activity timeline"
        title="The mission log. Search it, follow it, export it."
        lede="Every agent decision in order — with live relative timestamps, text search, follow-live streaming, one-click JSON copy, and CSV export for post-run analysis."
      />
      <div className="panel panel-inner">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12, alignItems: "end" }}>
          <div className="search-box" style={{ maxWidth: 280 }}>
            <Search size={16} aria-hidden="true" />
            <label className="sr-only" htmlFor="tl-search">Search events</label>
            <input
              id="tl-search"
              type="search"
              placeholder="Search decisions…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="field" style={{ marginBottom: 0, minWidth: 170 }}>
            <label htmlFor="tl-agent">Agent</label>
            <select id="tl-agent" value={agentFilter} onChange={(e) => setAgentFilter(e.target.value as "all" | AgentKind)}>
              <option value="all">All agents</option>
              {AGENT_ORDER.map((a) => (
                <option key={a} value={a}>
                  {AGENT_NAMES[a]}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0, minWidth: 150 }}>
            <label htmlFor="tl-sev">Severity</label>
            <select id="tl-sev" value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
              <option value="all">All</option>
              <option value="started">started</option>
              <option value="progress">progress</option>
              <option value="completed">completed</option>
              <option value="warning">warning</option>
              <option value="failed">failed</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: 8, marginLeft: "auto", flexWrap: "wrap" }}>
            <button
              type="button"
              className="chip cool"
              aria-pressed={follow}
              onClick={() => setFollow(!follow)}
              title="Auto-scroll to newest events"
            >
              <ArrowDownToLine size={14} aria-hidden="true" /> {follow ? "Following live" : "Follow live"}
            </button>
            <button type="button" className="icon-btn" disabled={events.length === 0} onClick={exportCSV}>
              <Download size={14} aria-hidden="true" /> CSV
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <span className="badge b-grey">{all.length} total</span>
          <span className="badge b-emerald">{all.filter((e) => e.status === "completed").length} completed</span>
          {warnCount > 0 ? <span className="badge b-amber">{warnCount} warnings</span> : null}
          {failCount > 0 ? <span className="badge b-red">{failCount} failures</span> : null}
          <span className="mono" style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink-3)", alignSelf: "center" }}>
            showing {events.length} / {all.length}
          </span>
        </div>

        <div aria-live="polite" className="sr-only">
          {workflow ? `${all.length} events in workflow ${workflow.id}, status ${workflow.status}` : "No workflow events"}
        </div>

        {events.length === 0 ? (
          <p style={{ color: "var(--ink-2)", fontSize: 14 }}>
            {all.length === 0
              ? "No events yet — run a match to populate the mission log."
              : "No events match the current search and filters."}
          </p>
        ) : (
          <>
            <ul className="timeline-list" style={{ maxHeight: 520, overflowY: "auto", paddingRight: 6 }}>
              {events.map((e, idx) => {
                const open = openId === e.id;
                const isLatest = idx === events.length - 1;
                return (
                  <li key={e.id} className={`timeline-item${isLatest ? " tl-fresh" : ""}`}>
                    <span className="timeline-rail">
                      <StatusDot status={eventStatusToAgent(e.status)} />
                    </span>
                    <div>
                      <button
                        type="button"
                        onClick={() => setOpenId(open ? null : e.id)}
                        aria-expanded={open}
                        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", font: "inherit", width: "100%" }}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <AgentIcon agent={e.agent} size={15} />
                          <span className="timeline-msg">{e.message}</span>
                          <ChevronDown
                            size={14}
                            aria-hidden="true"
                            style={{ color: "var(--ink-3)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", flex: "none" }}
                          />
                        </span>
                      </button>
                      <span className="timeline-meta">
                        <span>{AGENT_NAMES[e.agent]} · {e.type} · {e.status}</span>
                        <span title={formatDateTime(e.timestamp)}>
                          {formatClock(e.timestamp)} · {timeAgo(e.timestamp, now)}
                        </span>
                      </span>
                      {open ? (
                        <div>
                          <pre className="timeline-detail">
                            {JSON.stringify({ id: e.id, workflowId: e.workflowId, agent: e.agent, type: e.type, status: e.status, timestamp: e.timestamp, metadata: e.metadata ?? null }, null, 2)}
                          </pre>
                          <button
                            type="button"
                            className="icon-btn btn-sm"
                            style={{ marginTop: 8 }}
                            onClick={() => void copyJSON(e)}
                          >
                            {copiedId === e.id ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
                            {copiedId === e.id ? "Copied" : "Copy event JSON"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
            <div ref={endRef} aria-hidden="true" />
          </>
        )}
      </div>
    </Section>
  );
}

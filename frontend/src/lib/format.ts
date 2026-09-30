/** Format an ISO timestamp as HH:MM:SS local time. */
export function formatClock(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour12: false });
}

/** Format an ISO timestamp as a short date + time. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/** Relative "Xs ago" label for last-update freshness. */
export function timeAgo(iso: string | null | undefined, nowMs?: number): string {
  if (!iso) return "no updates yet";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "unknown";
  const s = Math.max(0, Math.round(((nowMs ?? Date.now()) - t) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

/** Compress a real event timestamp gap into a replay delay (ms). */
export function compressedGap(prevIso: string, nextIso: string): number {
  const dt = Date.parse(nextIso) - Date.parse(prevIso);
  if (!Number.isFinite(dt) || dt <= 0) return 900;
  return Math.min(2500, Math.max(450, dt > 8000 ? 1600 : dt * 0.25));
}

export function formatNum(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

/** Live countdown clock HH:MM:SS for surplus expiry. */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "expired";
  const s = Math.floor(ms / 1000);
  const p = (n: number): string => String(n).padStart(2, "0");
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

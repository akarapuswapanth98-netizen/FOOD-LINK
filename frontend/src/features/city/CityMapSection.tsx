import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { MAP_POINTS, SHELTERS, SURPLUS_PARTNERS } from "../../data/mock-adapter";
import { LIVE_MODE } from "../../data/api-client";
import { useFoodlinkStore, useRevealedEvents } from "../../store/useFoodlinkStore";
import { useMotionAllowed } from "../../hooks/prefs";
import { Section } from "../../components/Chrome";
import { EmptyState, SectionHead, WorkflowBadge } from "../../components/ui";
import type { RealMapPin } from "./RealMap";

const RealMapView = lazy(() => import("./RealMap").then((m) => ({ default: m.RealMap })));

/* Deterministic pseudo-random for the street fabric (stable across renders). */
function rand(seed: number): number {
  let s = seed;
  s = (s * 16807) % 2147483647;
  return s / 2147483647;
}

function pt(id: string | undefined, fallback: { x: number; y: number }): { x: number; y: number } {
  if (id && MAP_POINTS[id]) return { x: MAP_POINTS[id].x, y: MAP_POINTS[id].y };
  return fallback;
}

function curve(a: { x: number; y: number }, b: { x: number; y: number }, lift: number): string {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2 - lift;
  return `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`;
}

/**
 * Dark-map logistics view: street fabric, lake, parks, locality labels,
 * live route with animated courier — all geometry anchored to real
 * partner/shelter localities. Offline-safe (pure SVG, no tile servers).
 */
function MapCanvas({
  sourceId,
  sourceName,
  dests,
  stage,
  motionOK,
}: {
  sourceId: string | undefined;
  sourceName: string;
  dests: Array<{ id: string; name: string; detail: string }>;
  stage: number;
  motionOK: boolean;
}): React.JSX.Element {
  const S = pt(sourceId, { x: 470, y: 250 });
  const D = dests.map((d, i) =>
    pt(d.id, { x: 350 + i * 40, y: 110 + i * 60 }),
  );
  const d1 = D.length > 0 ? curve(S, D[0], 46) : "";
  const d2 = D.length > 1 ? curve(D[0], D[1], 30) : "";

  const verticals: number[] = [];
  for (let i = 0; i < 17; i++) verticals.push(24 + i * 36 + (rand(i + 3) - 0.5) * 14);
  const horizontals: number[] = [];
  for (let i = 0; i < 11; i++) horizontals.push(22 + i * 32 + (rand(i + 40) - 0.5) * 12);

  return (
    <div className="map-wrap">
      <svg viewBox="0 0 640 360" role="img" aria-label={`Bengaluru south delivery map. Stage: ${["awaiting route", "pickup", "transit", "handoff complete"][stage]}.`}>
        <defs>
          <linearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ff5c6c" />
            <stop offset="55%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        <rect width="640" height="360" fill="#0a1118" rx="12" />

        {/* water */}
        <ellipse cx="562" cy="306" rx="72" ry="34" fill="#10283f" />
        <ellipse cx="562" cy="306" rx="72" ry="34" fill="none" stroke="#1d3f61" strokeWidth="1.5" />
        <text x="562" y="309" textAnchor="middle" className="map-label" fontSize="10">AGARA LAKE</text>
        <ellipse cx="96" cy="318" rx="46" ry="20" fill="#10283f" opacity="0.8" />

        {/* parks */}
        <rect x="292" y="138" width="86" height="48" rx="9" fill="#123524" />
        <rect x="292" y="138" width="86" height="48" rx="9" fill="none" stroke="#1e5c3c" strokeWidth="1.2" />
        <text x="335" y="166" textAnchor="middle" className="map-label" fontSize="10">CUBBON PARK</text>
        <circle cx="330" cy="322" r="20" fill="#123524" />
        <text x="330" y="325" textAnchor="middle" className="map-label" fontSize="9">LALBAGH</text>

        {/* minor street fabric */}
        {verticals.map((x, i) => (
          <line key={`v${i}`} x1={x} y1={8} x2={x + (rand(i + 100) - 0.5) * 30} y2={352} className="map-road-minor" strokeWidth="1" />
        ))}
        {horizontals.map((y, i) => (
          <line key={`h${i}`} x1={8} y1={y} x2={632} y2={y + (rand(i + 200) - 0.5) * 24} className="map-road-minor" strokeWidth="1" />
        ))}

        {/* arterials */}
        <ellipse cx="320" cy="192" rx="252" ry="142" fill="none" className="map-road-major" strokeWidth="2.6" />
        <line x1="296" y1="150" x2="430" y2="150" className="map-road-major" strokeWidth="2.6" />
        <line x1="404" y1="196" x2="474" y2="336" className="map-road-major" strokeWidth="2.6" />
        <line x1="430" y1="128" x2="566" y2="106" className="map-road-major" strokeWidth="2" />
        <line x1="180" y1="60" x2="180" y2="330" className="map-road-major" strokeWidth="2" opacity="0.7" />

        {/* locality labels */}
        <text x="508" y="272" className="map-label" fontSize="11">KORAMANGALA</text>
        <text x="528" y="106" className="map-label" fontSize="11">INDIRANAGAR</text>
        <text x="440" y="344" className="map-label" fontSize="11">HSR LAYOUT</text>
        <text x="352" y="140" className="map-label" fontSize="10">MG ROAD</text>
        <text x="352" y="88" className="map-label" fontSize="10">SHIVAJINAGAR</text>
        <text x="150" y="66" className="map-label" fontSize="10">YESHWANTHPUR</text>
        <text x="368" y="300" className="map-label" fontSize="10">JAYANAGAR</text>

        {/* map chrome */}
        <text x="20" y="30" fill="#c6d0e4" fontSize="12" fontFamily="monospace" fontWeight="700">BENGALURU · SOUTH</text>
        <g transform="translate(20 336)" aria-hidden="true">
          <line x1="0" y1="0" x2="60" y2="0" stroke="#8f9bb3" strokeWidth="2" />
          <line x1="0" y1="-4" x2="0" y2="4" stroke="#8f9bb3" strokeWidth="2" />
          <line x1="60" y1="-4" x2="60" y2="4" stroke="#8f9bb3" strokeWidth="2" />
          <text x="30" y="-8" textAnchor="middle" fill="#8f9bb3" fontSize="9" fontFamily="monospace">2 km</text>
        </g>
        <g transform="translate(608 34)" aria-hidden="true">
          <circle r="12" fill="none" stroke="#8f9bb3" strokeWidth="1.5" />
          <text y="4" textAnchor="middle" fill="#c6d0e4" fontSize="10" fontFamily="monospace">N</text>
          <path d="M 0 -6 L 3 -1 L 0 -3 L -3 -1 Z" fill="#c6d0e4" />
        </g>

        {/* live route */}
        {D.length > 0 ? (
          <g>
            <path d={d1} fill="none" stroke="url(#routeGrad)" strokeWidth={6} opacity={0.22} strokeLinecap="round" />
            <path d={d1} fill="none" stroke="#7dd3fc" strokeWidth={2.4} strokeDasharray={stage >= 3 ? undefined : "9 7"}
              className={stage < 3 && motionOK ? "net-edge-flow" : undefined} strokeLinecap="round" style={{ animationDuration: "0.7s" }} />
            {d2 ? (
              <path d={d2} fill="none" stroke="#f472b6" strokeWidth={2} strokeDasharray="6 6" opacity={0.9} strokeLinecap="round" />
            ) : null}
            {/* courier */}
            {stage >= 1 && stage < 3 ? (
              <g>
                {motionOK ? <circle r={9} fill="none" stroke="#38bdf8" strokeWidth={2} className="map-pin-pulse" /> : null}
                <circle r={5} fill="#fff" stroke="#38bdf8" strokeWidth={2.5} className="map-courier"
                  style={{ offsetPath: `path("${d1}")`, animationDuration: "4.5s", animationPlayState: motionOK ? "running" : "paused" }} />
              </g>
            ) : null}
          </g>
        ) : null}

        {/* source pin */}
        <g transform={`translate(${S.x} ${S.y})`}>
          {motionOK ? <circle r={10} fill="none" stroke="#ff5c6c" strokeWidth={2} className="map-pin-pulse" /> : null}
          <circle r={8} fill="#e11d48" stroke="#ffd7db" strokeWidth={1.6} />
          <text textAnchor="middle" dy={3.6} fill="#fff" fontSize={9} fontWeight={800} fontFamily="monospace">S</text>
          <text textAnchor="middle" y={-15} fill="#f5f8ff" fontSize={10.5} fontFamily="monospace" fontWeight={700}>{sourceName.slice(0, 20)}</text>
        </g>

        {/* destination pins */}
        {D.map((p, i) => (
          <g key={dests[i].id} transform={`translate(${p.x} ${p.y})`}>
            {motionOK ? <circle r={10} fill="none" stroke="#34d399" strokeWidth={2} className="map-pin-pulse" style={{ animationDelay: `${i * 0.5}s` }} /> : null}
            <circle r={8} fill="#059669" stroke="#c9f5e2" strokeWidth={1.6} />
            <text textAnchor="middle" dy={3.6} fill="#fff" fontSize={9} fontWeight={800} fontFamily="monospace">D{i + 1}</text>
            <text textAnchor="middle" y={-15} fill="#f5f8ff" fontSize={10} fontFamily="monospace" fontWeight={700}>
              {dests[i].name.slice(0, 22)}
            </text>
            <text textAnchor="middle" y={24} fill="#8f9bb3" fontSize={9.5} fontFamily="monospace">{dests[i].detail}</text>
          </g>
        ))}

        {/* legend */}
        <g transform="translate(20 52)" fontFamily="monospace" fontSize="10" fill="#8f9bb3">
          <circle cx="6" cy="-3" r="5" fill="#e11d48" />
          <text x="16" y="0">SOURCE</text>
          <circle cx="86" cy="-3" r="5" fill="#059669" />
          <text x="96" y="0">SHELTER</text>
          <line x1="168" y1="-3" x2="196" y2="-3" stroke="#7dd3fc" strokeWidth="2.5" />
          <text x="202" y="0">LIVE ROUTE</text>
        </g>
      </svg>
    </div>
  );
}

/** Logistics view: live tile map (online) with offline SVG fallback + stage list. */
export function CityMapSection(): React.JSX.Element {
  const workflow = useFoodlinkStore((s) => s.workflow);
  const liveCatalog = useFoodlinkStore((s) => s.liveCatalog);
  const revealed = useRevealedEvents();
  const motionOK = useMotionAllowed();
  const allocs = workflow?.allocations ?? [];
  const hasRoute = allocs.length > 0;
  const [mapFailed, setMapFailed] = useState(false);
  const [online, setOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine,
  );

  useEffect(() => {
    const goOnline = (): void => {
      setOnline(true);
      setMapFailed(false);
    };
    const goOffline = (): void => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const routePlanned = revealed.some((e) => e.type === "route.planned");
  const dispatched = revealed.some((e) => e.type.startsWith("dispatch."));
  const delivered = revealed.some((e) => e.type === "delivery.completed" || e.type === "handoff.verified");

  const stage = !routePlanned ? 0 : !dispatched ? 1 : !delivered ? 2 : 3;
  const stageLabel = ["Awaiting route plan", "Pickup", "Transit", "Handoff complete"][stage];

  const geo = (id: string | undefined): { lat: number; lng: number } | null => {
    if (!id) return null;
    const liveRest = liveCatalog?.restaurants.find((x) => x.id === id);
    if (liveRest) return { lat: liveRest.lat, lng: liveRest.lon };
    const liveShel = liveCatalog?.shelters.find((x) => x.id === id);
    if (liveShel) return { lat: liveShel.lat, lng: liveShel.lon };
    if (MAP_POINTS[id]) return { lat: MAP_POINTS[id].lat, lng: MAP_POINTS[id].lng };
    return null;
  };
  const srcGeo = geo(workflow?.source?.id);
  const sourcePin: RealMapPin | null =
    hasRoute && srcGeo
      ? { id: workflow?.source?.id ?? "src", name: workflow?.source?.name ?? "Source", lat: srcGeo.lat, lng: srcGeo.lng }
      : null;
  const destPins: RealMapPin[] = hasRoute
    ? allocs.flatMap((a) => {
        const g = geo(a.destinationId);
        return g ? [{ id: a.destinationId, name: a.destinationName, detail: `${a.quantity} ${a.unit} · ETA ${a.etaMinutes} min`, lat: g.lat, lng: g.lng }] : [];
      })
    : [];
  const extras: RealMapPin[] = useMemo(() => {
    if (liveCatalog) {
      return [
        ...liveCatalog.restaurants.map((p) => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lon })),
        ...liveCatalog.shelters.map((p) => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lon })),
      ];
    }
    return [...SURPLUS_PARTNERS, ...SHELTERS].flatMap((p) => {
      const g = geo(p.id);
      return g ? [{ id: p.id, name: p.name, lat: g.lat, lng: g.lng }] : [];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveCatalog]);
  const showReal = online && !mapFailed;

  return (
    <Section id="city">
      <SectionHead
        eyebrow="05 · 3D city map / logistics view"
        title={LIVE_MODE ? "Hyderabad, live: from pickup to handoff." : "Bengaluru South, live: from pickup to handoff."}
        lede="A live tile map with road-network routing and a courier marker — falling back to an offline vector map with zero data loss. Distances and ETAs are reported values, never invented."
      />
      <div className="split-32">
        <div className="panel panel-inner">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <Navigation size={16} aria-hidden="true" style={{ color: "var(--indigo)" }} />
            <strong style={{ color: "var(--ink-0)" }}>Delivery map</strong>
            <span className="badge b-cyan" style={{ marginLeft: 8 }}>{stageLabel}</span>
            <span style={{ marginLeft: "auto" }}>
              {workflow ? <WorkflowBadge status={workflow.status} /> : <span className="badge b-grey">no workflow</span>}
            </span>
          </div>
          {!hasRoute && !showReal ? (
            <EmptyState
              title="No route to draw"
              body="Routes appear once a workflow reports allocations. Rescue a lot from the surplus board to draw a real route."
            />
          ) : showReal ? (
            <>
              <Suspense
                fallback={
                  <div className="realmap" style={{ display: "grid", placeItems: "center" }}>
                    <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>loading live map tiles…</span>
                  </div>
                }
              >
                <RealMapView
                  source={sourcePin}
                  dests={destPins}
                  extras={extras}
                  stage={stage}
                  motionOK={motionOK}
                  onError={() => setMapFailed(true)}
                />
              </Suspense>
              <p className="mono" style={{ fontSize: 11, color: "var(--ink-3)", margin: "10px 2px 0" }}>
                Live tiles © Esri, © OpenStreetMap contributors · road geometry via OSRM · pins, distances & ETAs from workflow data (as reported)
              </p>
            </>
          ) : (
            <MapCanvas
              sourceId={workflow?.source?.id}
              sourceName={workflow?.source?.name ?? "Source"}
              dests={allocs.map((a) => ({
                id: a.destinationId,
                name: a.destinationName,
                detail: `${a.quantity} ${a.unit} · ${a.distanceKm.toFixed(1)} km${a.etaMinutes > 0 ? ` · ETA ${a.etaMinutes}m` : ""}`,
              }))}
              stage={stage}
              motionOK={motionOK}
            />
          )}
        </div>

        <div className="panel panel-inner" aria-live="polite">
          <strong style={{ color: "var(--ink-0)" }}>Delivery stages</strong>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 0 }}>
            {[
              { label: "Pickup", desc: workflow?.source ? `Collect from ${workflow.source.name}` : "Awaiting source", done: stage >= 1 },
              { label: "Transit", desc: hasRoute ? `${allocs.map((a) => `${a.distanceKm.toFixed(1)} km`).join(" + ")} en route` : "Awaiting route", done: stage >= 2 },
              { label: "Handoff", desc: hasRoute ? allocs.map((a) => `${a.quantity} ${a.unit} → ${a.destinationName}`).join("; ") : "Awaiting allocation", done: stage >= 3 },
            ].map((s, i) => (
              <div key={s.label} className="map-fallback-row" style={{ borderBottom: i === 2 ? "none" : undefined }}>
                <span className={`dot ${s.done ? "emerald" : stage === i ? "cyan pulse" : "grey"}`} aria-hidden="true" />
                <div>
                  <div style={{ color: "var(--ink-0)", fontWeight: 600, fontSize: 13.5 }}>{s.label}</div>
                  <div className="mono" style={{ fontSize: 12, color: "var(--ink-2)" }}>{s.desc}</div>
                </div>
                <span className="mono" style={{ marginLeft: "auto", fontSize: 11, color: "var(--ink-3)" }}>
                  {s.done ? "DONE" : stage === i ? "ACTIVE" : "QUEUED"}
                </span>
              </div>
            ))}
          </div>
          {hasRoute ? (
            <div className="mono" style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 12 }}>
              <MapPin size={13} aria-hidden="true" style={{ verticalAlign: "-2px" }} />{" "}
              {allocs.map((a) => `ETA ${a.etaMinutes > 0 ? `${a.etaMinutes} min` : "—"} · ${a.distanceKm.toFixed(1)} km`).join(" · ")} (as reported)
            </div>
          ) : null}
        </div>
      </div>
    </Section>
  );
}

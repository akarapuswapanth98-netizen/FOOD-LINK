import { useEffect, useRef, useState } from "react";
import type {
  Map as LeafletMap,
  LayerGroup as LeafletLayerGroup,
  Marker as LeafletMarker,
  LatLngExpression,
} from "leaflet";
import "leaflet/dist/leaflet.css";

export interface RealMapPin {
  id: string;
  name: string;
  detail?: string;
  lat: number;
  lng: number;
}

interface RealMapProps {
  source: RealMapPin | null;
  dests: RealMapPin[];
  extras: RealMapPin[];
  stage: number;
  motionOK: boolean;
  onError: () => void;
}

type LatLng = [number, number];

async function osrmLeg(a: RealMapPin, b: RealMapPin): Promise<LatLng[] | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}` +
      `?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      routes?: Array<{ geometry?: { coordinates?: Array<[number, number]> } }>;
    };
    const coords = body.routes?.[0]?.geometry?.coordinates;
    if (!coords || coords.length < 2) return null;
    return coords.map(([lng, lat]) => [lat, lng]);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Real map: OSM/CARTO dark tiles, OSRM road-network routing, live courier.
 * Hardened: prop-identity churn can't wipe the courier or yank the viewport,
 * tile outages auto-fallback to the offline SVG, and any init failure
 * surfaces the fallback instead of a grey box.
 */
export function RealMap(props: RealMapProps): React.JSX.Element {
  const { stage, motionOK } = props;
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layersRef = useRef<LeafletLayerGroup | null>(null);
  const courierRef = useRef<LeafletMarker | null>(null);
  const lastFitKey = useRef<string>("");
  const [ready, setReady] = useState(false);
  const [lines, setLines] = useState<LatLng[][]>([]);
  const [drawTick, setDrawTick] = useState(0);

  // Latest props without identity churn: effects dep on stable scalars only.
  const propsRef = useRef(props);
  propsRef.current = props;
  const errRef = useRef(props.onError);
  errRef.current = props.onError;

  const routeKey = `${props.source?.id ?? "none"}>${props.dests.map((d) => d.id).join("+")}`;

  // 1 · init map once. Tile outage → fallback instead of a grey grid.
  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | null = null;
    let tileErrors = 0;
    let tileLoads = 0;
    (async () => {
      try {
        const L = await import("leaflet");
        if (cancelled || !divRef.current) return;
        map = L.map(divRef.current, {
          zoomControl: true,
          attributionControl: true,
          zoomAnimation: true,
          scrollWheelZoom: true,
        }).setView([12.95, 77.62], 12);
        // Esri dark-grey canvas: free, keyless, dark-theme native.
        // (CARTO basemaps now require an API key, so they are not used.)
        const tiles = L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
          {
            attribution:
              "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ &copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors",
            maxZoom: 19,
          },
        );
        tiles.on("tileerror", () => {
          tileErrors += 1;
          if (tileErrors >= 12) errRef.current();
        });
        tiles.on("tileload", () => {
          tileLoads += 1;
        });
        tiles.addTo(map);
        // Watchdog: zero tiles in 15s means the tile CDN is unreachable.
        setTimeout(() => {
          if (!cancelled && tileLoads === 0) errRef.current();
        }, 15000);
        mapRef.current = map;
        layersRef.current = L.layerGroup().addTo(map);
        setReady(true);
        requestAnimationFrame(() => map?.invalidateSize());
      } catch {
        errRef.current();
      }
    })();
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      layersRef.current = null;
      courierRef.current = null;
    };
  }, []);

  // 2 · fetch road geometry when the route identity changes.
  useEffect(() => {
    let cancelled = false;
    setLines([]);
    const { source, dests } = propsRef.current;
    if (!source || dests.length === 0) return;
    (async () => {
      const legs: RealMapPin[][] = [[source, dests[0]]];
      if (dests[1]) legs.push([dests[0], dests[1]]);
      const results = await Promise.all(legs.map(([a, b]) => osrmLeg(a, b)));
      if (cancelled) return;
      setLines(
        results.map((r, i) =>
          r ?? [
            [legs[i][0].lat, legs[i][0].lng],
            [legs[i][1].lat, legs[i][1].lng],
          ],
        ),
      );
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);

  // 3 · draw pins + routes. Fits the viewport only when the route changes.
  useEffect(() => {
    if (!ready || !mapRef.current || !layersRef.current) return;
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled) return;
      const map = mapRef.current;
      const group = layersRef.current;
      if (!map || !group) return;
      const { source, dests, extras } = propsRef.current;
      group.clearLayers();
      courierRef.current = null;

      for (const p of extras) {
        L.circleMarker([p.lat, p.lng], {
          radius: 4,
          color: "#5d687f",
          weight: 1.5,
          fillColor: "#2b3a55",
          fillOpacity: 0.9,
        })
          .bindTooltip(p.name, { direction: "top", offset: [0, -6], className: "rm-tip" })
          .addTo(group);
      }

      const mainPts: LatLngExpression[] = [];
      if (source) {
        mainPts.push([source.lat, source.lng]);
        L.marker([source.lat, source.lng], {
          icon: L.divIcon({
            className: "",
            html: `<div class="rm-pin rm-src"><span>S</span></div><div class="rm-tag">${source.name}</div>`,
            iconSize: [34, 52],
            iconAnchor: [17, 46],
          }),
        })
          .bindPopup(`<b>${source.name}</b><br/>Pickup · surplus source`)
          .addTo(group);
      }
      dests.forEach((d, i) => {
        mainPts.push([d.lat, d.lng]);
        L.marker([d.lat, d.lng], {
          icon: L.divIcon({
            className: "",
            html: `<div class="rm-pin rm-dest"><span>D${i + 1}</span></div><div class="rm-tag">${d.name}</div>`,
            iconSize: [34, 52],
            iconAnchor: [17, 46],
          }),
        })
          .bindPopup(`<b>${d.name}</b><br/>${d.detail ?? "Drop-off shelter"}`)
          .addTo(group);
      });

      if (lines.length > 0) {
        lines.forEach((line, i) => {
          L.polyline(line, { color: i === 0 ? "#38bdf8" : "#f472b6", weight: 5, opacity: 0.9 }).addTo(group);
        });
      } else if (source && dests.length > 0) {
        L.polyline(
          [[source.lat, source.lng], ...dests.map((d) => [d.lat, d.lng] as LatLng)],
          { color: "#38bdf8", weight: 4, opacity: 0.85, dashArray: "8 8" },
        ).addTo(group);
      }

      if (lastFitKey.current !== routeKey) {
        lastFitKey.current = routeKey;
        if (mainPts.length > 0) {
          map.fitBounds(L.latLngBounds(mainPts).pad(0.35), { animate: propsRef.current.motionOK });
        } else if (extras.length > 0) {
          map.fitBounds(
            L.latLngBounds(extras.map((p) => [p.lat, p.lng] as LatLng)).pad(0.3),
            { animate: false },
          );
        }
      }
      setDrawTick((t) => t + 1);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, routeKey, lines, motionOK]);

  // 4 · courier rides the first leg; recreated after every redraw.
  useEffect(() => {
    if (!ready || !layersRef.current) return;
    let raf = 0;
    let cancelled = false;
    const group = layersRef.current;
    const line = lines[0];
    if (!group || !line || line.length < 2 || stage < 1 || stage >= 3) return;
    (async () => {
      const L = await import("leaflet");
      if (cancelled) return;
      const marker = L.marker(line[0], {
        icon: L.divIcon({ className: "", html: `<div class="rm-courier"></div>`, iconSize: [18, 18], iconAnchor: [9, 9] }),
        interactive: false,
        keyboard: false,
      }).addTo(group);
      courierRef.current = marker;
      if (!motionOK) {
        marker.setLatLng(line[line.length - 1]);
        return;
      }
      const LOOP_MS = 12000;
      const t0 = performance.now();
      const tick = (t: number): void => {
        if (cancelled) return;
        const f = ((t - t0) % LOOP_MS) / LOOP_MS;
        const idx = f * (line.length - 1);
        const i0 = Math.floor(idx);
        const i1 = Math.min(line.length - 1, i0 + 1);
        const fr = idx - i0;
        marker.setLatLng([
          line[i0][0] + (line[i1][0] - line[i0][0]) * fr,
          line[i0][1] + (line[i1][1] - line[i0][1]) * fr,
        ]);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      const g = layersRef.current;
      const m = courierRef.current;
      courierRef.current = null;
      if (g && m) {
        try {
          g.removeLayer(m);
        } catch {
          // layer already cleared by a redraw — nothing to do
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, lines, stage, motionOK, drawTick]);

  return <div ref={divRef} className="realmap" aria-label="Live delivery map of Bengaluru South" />;
}

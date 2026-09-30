import { useEffect, useRef, useState } from "react";
import { Footer, ScrollProgress } from "./components/Chrome";
import { Shell } from "./components/Shell";
import { Tour } from "./components/Tour";
import { Hero } from "./features/hero/Hero";
import { NetworkSection } from "./features/network/NetworkSection";
import { SurplusBoard } from "./features/surplus/SurplusBoard";
import { MatchEngine } from "./features/match/MatchEngine";
import { NegotiationReplay } from "./features/replay/NegotiationReplay";
import { CityMapSection } from "./features/city/CityMapSection";
import { OperationsSection } from "./features/ops/OperationsSection";
import { TimelineSection } from "./features/timeline/TimelineSection";
import { ImpactSection } from "./features/impact/ImpactSection";
import { AnalyticsSection } from "./features/analytics/AnalyticsSection";
import { HowItWorks } from "./features/how/HowItWorks";
import { ControlPanel } from "./features/control/ControlPanel";
import { useFoodlinkStore } from "./store/useFoodlinkStore";
import { LIVE_MODE } from "./data/api-client";
import { detectWebGL, useWebglContextLoss } from "./hooks/prefs";

function defaultRequest() {
  const now = Date.now();
  return {
    restaurant_id: "rest-meghana",
    surplus_items: [
      {
        item: "Chicken Dum Biryani",
        quantity: 32,
        unit: "meals",
        expires_at: new Date(now + 4 * 3600000).toISOString(),
      },
    ],
    constraints: {
      max_distance_km: 8,
      pickup_window_start: new Date(now + 30 * 60000).toISOString(),
      pickup_window_end: new Date(now + 4 * 3600000).toISOString(),
    },
    scenario: "success" as const,
  };
}

export default function App(): React.JSX.Element {
  const runMatch = useFoodlinkStore((s) => s.runMatch);
  const forceFallback = useFoodlinkStore((s) => s.forceFallback);
  const webglLost = useFoodlinkStore((s) => s.webglLost);
  const setWebglLost = useFoodlinkStore((s) => s.setWebglLost);
  const [webglOK] = useState<boolean>(() => detectWebGL());
  const [tour, setTour] = useState(false);
  const started = useRef(false);

  useWebglContextLoss(() => setWebglLost(true));

  // Stale-data guard: re-sync the lot registry when the tab regains focus
  // after more than a minute away. No polling loop, no sockets.
  useEffect(() => {
    if (!LIVE_MODE) return;
    const onVis = (): void => {
      if (document.visibilityState !== "visible") return;
      const at = useFoodlinkStore.getState().lastCatalogAt;
      if (at !== null && Date.now() - at > 60000) {
        void useFoodlinkStore.getState().loadLiveCatalog();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Vertical slice: drive the whole experience with one adapter-backed
  // workflow on load so the narrative is visible immediately.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (LIVE_MODE) {
      // Live backend owns the data: load its catalog, then match its seed lot.
      void useFoodlinkStore
        .getState()
        .loadLiveCatalog()
        .then(() => {
          const cat = useFoodlinkStore.getState().liveCatalog;
          const lot = cat?.lots.find((l) => l.status === "available") ?? cat?.lots[0];
          const rest = cat?.restaurants.find((r) => r.id === lot?.restaurant_id) ?? cat?.restaurants[0];
          if (lot && rest) {
            void runMatch({
              restaurant_id: rest.id,
              surplus_items: [{ item: lot.food_type, quantity: lot.meal_count, unit: "meals", expires_at: lot.expires_at }],
              constraints: {
                max_distance_km: 10,
                pickup_window_start: new Date().toISOString(),
                pickup_window_end: lot.expires_at,
              },
              surplus_id: lot.id,
            });
          } else {
            void runMatch(defaultRequest());
          }
        });
    } else {
      void runMatch(defaultRequest());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const noWebGL = forceFallback || webglLost || !webglOK;

  return (
    <>
      <ScrollProgress />
      {tour ? <Tour onDone={() => setTour(false)} /> : null}
      <Shell onTour={() => setTour(true)}>
        <main id="main">
        <Hero noWebGL={noWebGL} onTour={() => setTour(true)} />
        <NetworkSection noWebGL={noWebGL} />
        <SurplusBoard />
        <MatchEngine />
        <NegotiationReplay />
        <CityMapSection />
        <OperationsSection />
        <TimelineSection />
        <ImpactSection />
        <AnalyticsSection />
        <HowItWorks />
        <ControlPanel />
        </main>
        <Footer />
      </Shell>
    </>
  );
}

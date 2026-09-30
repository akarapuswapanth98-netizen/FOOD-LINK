import { useEffect, useMemo, useState } from "react";
import { Clock, Heart, MapPin, RotateCw, Search, Star, UtensilsCrossed } from "lucide-react";
import { SURPLUS_PARTNERS } from "../../data/mock-adapter";
import type { FoodArtKind } from "../../data/mock-adapter";
import { LIVE_MODE } from "../../data/api-client";
import { prettifyFoodType } from "../../data/live-mapper";
import { useFoodlinkStore } from "../../store/useFoodlinkStore";
import { Section } from "../../components/Chrome";
import { SectionHead } from "../../components/ui";
import { formatCountdown, timeAgo } from "../../lib/format";

/* ---------------- Inline SVG food illustrations (no external images) ---------------- */

const FOOD_PHOTOS: Record<FoodArtKind, string> = {
  thali: "/food/thali.jpg",
  biryani: "/food/biryani.jpg",
  burger: "/food/burger.jpg",
  bread: "/food/bread.jpg",
  bowl: "/food/bowl.jpg",
  pastry: "/food/pastry.jpg",
};

/** Realistic food photo with an illustrated fallback if the CDN is unreachable. */
function FoodImage({ kind, label }: { kind: FoodArtKind; label: string }): React.JSX.Element {
  const [failed, setFailed] = useState(false);
  if (failed) return <FoodArt kind={kind} />;
  return (
    <img
      src={FOOD_PHOTOS[kind]}
      alt={label}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function FoodArt({ kind }: { kind: FoodArtKind }): React.JSX.Element {
  if (kind === "thali") {
    return (
      <svg viewBox="0 0 400 168" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Veg thali illustration">
        <defs>
          <radialGradient id="th-bg" cx="50%" cy="30%" r="90%">
            <stop offset="0%" stopColor="#3d1630" />
            <stop offset="100%" stopColor="#1c0a1c" />
          </radialGradient>
        </defs>
        <rect width="400" height="168" fill="url(#th-bg)" />
        <ellipse cx="200" cy="96" rx="130" ry="56" fill="#8a6a2f" />
        <ellipse cx="200" cy="90" rx="122" ry="50" fill="#c9a24b" />
        <ellipse cx="200" cy="88" rx="110" ry="44" fill="#e8cf8f" />
        <ellipse cx="200" cy="98" rx="44" ry="20" fill="#fdf6e3" />
        <ellipse cx="200" cy="94" rx="40" ry="17" fill="#fffdf5" />
        <circle cx="128" cy="86" r="22" fill="#7a3b12" />
        <circle cx="128" cy="86" r="16" fill="#e07b26" />
        <circle cx="272" cy="86" r="22" fill="#0f5132" />
        <circle cx="272" cy="86" r="16" fill="#37b268" />
        <circle cx="200" cy="128" r="18" fill="#8f1d1d" />
        <circle cx="200" cy="128" r="12" fill="#e05252" />
        <ellipse cx="318" cy="120" rx="26" ry="10" fill="#f5e3b3" />
      </svg>
    );
  }
  if (kind === "biryani") {
    return (
      <svg viewBox="0 0 400 168" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Chicken biryani handi illustration">
        <defs>
          <radialGradient id="bi-bg" cx="50%" cy="20%" r="95%">
            <stop offset="0%" stopColor="#123b2a" />
            <stop offset="100%" stopColor="#08170f" />
          </radialGradient>
        </defs>
        <rect width="400" height="168" fill="url(#bi-bg)" />
        <path d="M185 34 q6 -12 0 -22 M200 36 q-6 -12 0 -24 M215 34 q6 -12 0 -22" stroke="#e8cf8f" strokeWidth="3" fill="none" opacity="0.7" strokeLinecap="round" />
        <ellipse cx="200" cy="72" rx="66" ry="26" fill="#f7ead0" />
        <ellipse cx="200" cy="66" rx="58" ry="22" fill="#fdf6e3" />
        <path d="M150 60 q20 -10 40 -4 M176 74 q24 -8 48 -2 M160 52 q30 -8 60 0" stroke="#e8a13c" strokeWidth="4" fill="none" opacity="0.85" strokeLinecap="round" />
        <circle cx="182" cy="62" r="3.4" fill="#2f7a3d" />
        <circle cx="216" cy="70" r="3.4" fill="#2f7a3d" />
        <circle cx="200" cy="56" r="3" fill="#a33b1f" />
        <path d="M132 78 h136 l-14 62 h-108 Z" fill="#6b3d16" />
        <path d="M132 78 h136 l-3 14 h-130 Z" fill="#8a5220" />
        <ellipse cx="200" cy="140" rx="68" ry="10" fill="#3a2110" />
      </svg>
    );
  }
  if (kind === "burger") {
    return (
      <svg viewBox="0 0 400 168" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Paneer slider illustration">
        <defs>
          <radialGradient id="bu-bg" cx="50%" cy="25%" r="95%">
            <stop offset="0%" stopColor="#4a1a10" />
            <stop offset="100%" stopColor="#200a06" />
          </radialGradient>
        </defs>
        <rect width="400" height="168" fill="url(#bu-bg)" />
        <ellipse cx="200" cy="140" rx="90" ry="12" fill="#160705" />
        <rect x="128" y="118" width="144" height="18" rx="9" fill="#d99a4e" />
        <rect x="122" y="104" width="156" height="16" rx="8" fill="#7a3b12" />
        <rect x="128" y="96" width="144" height="10" rx="5" fill="#f5c542" transform="rotate(-3 200 100)" />
        <path d="M122 92 q20 -12 40 0 t40 0 t40 0 t36 0 l0 8 h-156 Z" fill="#4da64d" />
        <rect x="134" y="80" width="132" height="12" rx="6" fill="#d94f3d" />
        <path d="M132 80 a68 44 0 0 1 136 0 Z" fill="#e8a95c" />
        <g fill="#f7e3b0">
          <ellipse cx="170" cy="56" rx="4" ry="2.6" />
          <ellipse cx="195" cy="48" rx="4" ry="2.6" />
          <ellipse cx="220" cy="56" rx="4" ry="2.6" />
          <ellipse cx="205" cy="66" rx="4" ry="2.6" />
          <ellipse cx="182" cy="66" rx="4" ry="2.6" />
        </g>
      </svg>
    );
  }
  if (kind === "bread") {
    return (
      <svg viewBox="0 0 400 168" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Fresh bread basket illustration">
        <defs>
          <radialGradient id="br-bg" cx="50%" cy="25%" r="95%">
            <stop offset="0%" stopColor="#4d2f10" />
            <stop offset="100%" stopColor="#201004" />
          </radialGradient>
        </defs>
        <rect width="400" height="168" fill="url(#br-bg)" />
        <g>
          <rect x="180" y="30" width="34" height="96" rx="17" fill="#d99a4e" transform="rotate(18 197 78)" />
          <rect x="150" y="38" width="32" height="90" rx="16" fill="#c9853c" transform="rotate(-14 166 83)" />
          <rect x="214" y="40" width="30" height="88" rx="15" fill="#e8b26a" transform="rotate(32 229 84)" />
          <g stroke="#8a5220" strokeWidth="2" opacity="0.8">
            <line x1="168" y1="60" x2="200" y2="52" />
            <line x1="170" y1="80" x2="202" y2="72" />
            <line x1="172" y1="100" x2="202" y2="94" />
          </g>
        </g>
        <path d="M120 108 h160 l-18 44 h-124 Z" fill="#7a4d1c" />
        <path d="M120 108 h160 l-4 12 h-152 Z" fill="#96622a" />
        <g stroke="#5c3a14" strokeWidth="2" opacity="0.7">
          <line x1="132" y1="122" x2="268" y2="122" />
          <line x1="136" y1="134" x2="264" y2="134" />
        </g>
      </svg>
    );
  }
  // bowl
  if (kind === "bowl") {
    return (
      <svg viewBox="0 0 400 168" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Buddha bowl illustration">
      <defs>
        <radialGradient id="bo-bg" cx="50%" cy="20%" r="95%">
          <stop offset="0%" stopColor="#0e3a3a" />
          <stop offset="100%" stopColor="#061a1a" />
        </radialGradient>
      </defs>
      <rect width="400" height="168" fill="url(#bo-bg)" />
      <line x1="252" y1="18" x2="212" y2="86" stroke="#c9a24b" strokeWidth="5" strokeLinecap="round" />
      <line x1="272" y1="22" x2="232" y2="88" stroke="#c9a24b" strokeWidth="5" strokeLinecap="round" />
      <path d="M120 92 h160 a0 0 0 0 1 0 0 c0 34 -36 56 -80 56 c-44 0 -80 -22 -80 -56 Z" fill="#123" />
      <path d="M118 90 h164 c0 36 -37 60 -82 60 c-45 0 -82 -24 -82 -60 Z" fill="#1d3a5f" />
      <ellipse cx="200" cy="90" rx="82" ry="20" fill="#0b1c30" />
      <g>
        <circle cx="168" cy="84" r="14" fill="#4da64d" />
        <circle cx="196" cy="80" r="15" fill="#e07b26" />
        <circle cx="224" cy="84" r="13" fill="#c9c93c" />
        <circle cx="244" cy="88" r="10" fill="#d94f6a" />
        <circle cx="150" cy="88" r="9" fill="#f7ead0" />
        <circle cx="210" cy="88" r="4" fill="#2f7a3d" />
      </g>
    </svg>
    );
  }
  // pastry + any future kind fall back to the bakery illustration
  return <FoodArt kind="bread" />;
}

/* ---------------- Board ---------------- */

const FAV_KEY = "foodlink:fav-lots";
const EXPIRING_MIN = 120;

function loadFavs(): Set<string> {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

type ChipFilter = "all" | "veg" | "expiring" | "favs";

interface LotView {
  id: string;
  item: string;
  quantity: number;
  unit: string;
  veg: boolean;
  expiresAtMs: number;
  art: FoodArtKind;
  /** Live-backend lot id. Absent in demo mode. */
  surplusId?: string;
}

interface PartnerView {
  id: string;
  name: string;
  sub: string;
  rating?: number;
  distanceKm?: number;
  offer?: string;
  lots: LotView[];
}

/** Map a backend food_type onto local art + photography. */
function artForFoodType(foodType: string): FoodArtKind {
  const t = foodType.toLowerCase();
  if (/biryani|biriyani/.test(t)) return "biryani";
  if (/burger|slider/.test(t)) return "burger";
  if (/croissant|pastry|cake|dessert/.test(t)) return "pastry";
  if (/bread|sourdough|loaf|bakery|bun/.test(t)) return "bread";
  if (/bowl|salad/.test(t)) return "bowl";
  return "thali";
}

export function SurplusBoard(): React.JSX.Element {
  const runMatch = useFoodlinkStore((s) => s.runMatch);
  const loading = useFoodlinkStore((s) => s.loading);
  const liveCatalog = useFoodlinkStore((s) => s.liveCatalog);
  const liveError = useFoodlinkStore((s) => s.liveError);
  const lastCatalogAt = useFoodlinkStore((s) => s.lastCatalogAt);
  const loadLiveCatalog = useFoodlinkStore((s) => s.loadLiveCatalog);
  const availableCount = LIVE_MODE && liveCatalog ? liveCatalog.lots.length : null;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ChipFilter>("all");
  const [favs, setFavs] = useState<Set<string>>(loadFavs);
  const [now, setNow] = useState(() => Date.now());
  const mountBase = useMemo(() => Date.now(), []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify([...favs]));
    } catch {
      // private mode — favorites simply won't persist
    }
  }, [favs]);

  const toggleFav = (id: string): void => {
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const q = query.trim().toLowerCase();
  const partners: PartnerView[] = useMemo(() => {
    if (LIVE_MODE && liveCatalog) {
      const byRest = new Map<string, PartnerView>();
      for (const lot of liveCatalog.lots) {
        const r = liveCatalog.restaurants.find((x) => x.id === lot.restaurant_id);
        if (!r) continue;
        let pv = byRest.get(r.id);
        if (!pv) {
          pv = {
            id: r.id,
            name: r.name,
            sub: [r.cuisine_types.join(" · "), r.address].filter(Boolean).join(" — ") || "Live partner",
            lots: [],
          };
          byRest.set(r.id, pv);
        }
        pv.lots.push({
          id: lot.id,
          item: prettifyFoodType(lot.food_type),
          quantity: lot.meal_count,
          unit: "meals",
          veg: lot.dietary_tags.some((t) => t.toLowerCase().includes("vegetarian") || t.toLowerCase() === "veg"),
          expiresAtMs: Date.parse(lot.expires_at),
          art: artForFoodType(lot.food_type),
          surplusId: lot.id,
        });
      }
      return [...byRest.values()];
    }
    return SURPLUS_PARTNERS.map((p) => ({
      id: p.id,
      name: p.name,
      sub: p.cuisines.join(" · "),
      rating: p.rating,
      distanceKm: p.distanceKm,
      offer: p.offer,
      lots: p.lots.map((lot) => ({
        id: lot.id,
        item: lot.item,
        quantity: lot.quantity,
        unit: lot.unit,
        veg: lot.veg,
        expiresAtMs: mountBase + lot.expiresInMin * 60000,
        art: lot.art,
      })),
    }));
  }, [liveCatalog, mountBase]);

  const cards = useMemo(
    () =>
      partners.map((p) => {
        const lots = p.lots
          .map((lot) => ({ lot, remaining: lot.expiresAtMs - now }))
          .filter(({ lot, remaining }) => {
            if (!Number.isFinite(remaining) || remaining <= 0) return false;
            if (filter === "veg" && !lot.veg) return false;
            if (filter === "expiring" && remaining > EXPIRING_MIN * 60000) return false;
            if (filter === "favs" && !favs.has(lot.id)) return false;
            if (q && !`${p.name} ${p.sub} ${lot.item}`.toLowerCase().includes(q)) return false;
            return true;
          })
          .sort((a, b) => a.remaining - b.remaining);
        return { partner: p, lots };
      }).filter((c) => c.lots.length > 0),
    [partners, now, filter, favs, q],
  );

  const rescue = (partnerId: string, lot: LotView): void => {
    const t = Date.now();
    void runMatch({
      restaurant_id: partnerId,
      surplus_items: [
        {
          item: lot.item,
          quantity: lot.quantity,
          unit: lot.unit,
          expires_at: new Date(lot.expiresAtMs).toISOString(),
        },
      ],
      constraints: {
        max_distance_km: 10,
        pickup_window_start: new Date(t).toISOString(),
        pickup_window_end: new Date(lot.expiresAtMs).toISOString(),
      },
      scenario: "success",
      surplus_id: lot.surplusId,
    });
    document.querySelector("#replay")?.scrollIntoView({ behavior: "smooth" });
  };

  const chip = (id: ChipFilter, label: string): React.JSX.Element => (
    <button type="button" className="chip" aria-pressed={filter === id} onClick={() => setFilter(id)}>
      {label}
    </button>
  );

  return (
    <Section id="surplus">
      <SectionHead
        eyebrow="02 · Live surplus board"
        title="Tonight's rescue menu. Claim it before it spoils."
        lede={
          LIVE_MODE
            ? "Real surplus lots from the live backend — quantities, true expiry countdowns, and one-tap rescue dispatch. Rescue the same lot twice to watch the 409 already-allocated state."
            : "Every restaurant's live surplus — quantities, live expiry countdowns, and one-tap rescue dispatch that fires a real agent workflow. Demo inventory, honestly labeled."
        }
      />
      <div className="board-toolbar" role="search">
        <div className="search-box">
          <Search size={16} aria-hidden="true" />
          <label className="sr-only" htmlFor="board-search">Search surplus food</label>
          <input
            id="board-search"
            type="search"
            placeholder="Search biryani, thali, bakery…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} role="group" aria-label="Surplus filters">
          {chip("all", "All lots")}
          {chip("veg", "Veg only")}
          {chip("expiring", "Expiring soon")}
          {chip("favs", "Saved")}
        </div>
        <span className={`badge ${LIVE_MODE ? "b-emerald" : "b-ember"}`} style={{ marginLeft: "auto" }}>
          {LIVE_MODE ? "live backend" : "demo inventory"}
        </span>
        {LIVE_MODE ? (
          <button
            type="button"
            className="icon-btn btn-sm"
            onClick={() => void loadLiveCatalog()}
            title="Re-fetch the lot registry now"
            aria-label={`Refresh surplus lots${lastCatalogAt ? `, last synced ${timeAgo(new Date(lastCatalogAt).toISOString(), now)}` : ""}`}
          >
            <RotateCw size={13} aria-hidden="true" />
            {lastCatalogAt ? `Synced ${timeAgo(new Date(lastCatalogAt).toISOString(), now)}` : "Sync"}
          </button>
        ) : null}
        {availableCount !== null && availableCount <= 2 ? (
          <span className="badge b-amber" role="status">
            low stock · {availableCount} lot{availableCount === 1 ? "" : "s"} left — reset demo data before presenting
          </span>
        ) : null}
      </div>

      {LIVE_MODE && !liveCatalog ? (
        <div className="panel panel-inner" role="status">
          <p style={{ margin: 0, color: "var(--ink-2)", fontSize: 14 }}>
            {liveError ?? "Connecting to the live backend catalog…"}
          </p>
        </div>
      ) : cards.length === 0 ? (
        <div className="panel panel-inner">
          <p style={{ margin: 0, color: "var(--ink-2)", fontSize: 14, display: "flex", gap: 10, alignItems: "center" }}>
            <UtensilsCrossed size={18} aria-hidden="true" /> No lots match these filters — try clearing the search or choosing “All lots”.
          </p>
        </div>
      ) : (
        <div className="grid-3">
          {cards.map(({ partner: p, lots }) => (
            <article
              key={p.id}
              className="panel food-card card-hover glow-card"
              aria-label={`${p.name} surplus`}
              onMouseMove={(e) => {
                const el = e.currentTarget;
                const r = el.getBoundingClientRect();
                el.style.setProperty("--mx", `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
                el.style.setProperty("--my", `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
              }}
            >
              <div className="art">
                <FoodImage kind={lots[0].lot.art} label={`${lots[0].lot.item} at ${p.name}`} />
                {p.offer ? <span className="offer">{p.offer}</span> : null}
                <button
                  type="button"
                  className="fav"
                  aria-pressed={favs.has(lots[0].lot.id)}
                  aria-label={favs.has(lots[0].lot.id) ? `Unsave ${lots[0].lot.item}` : `Save ${lots[0].lot.item}`}
                  onClick={() => toggleFav(lots[0].lot.id)}
                >
                  <Heart size={16} aria-hidden="true" fill={favs.has(lots[0].lot.id) ? "currentColor" : "none"} />
                </button>
              </div>
              <div className="body">
                <div className="title-row">
                  <span className="rname">{p.name}</span>
                  {typeof p.rating === "number" ? (
                    <span className="rating" aria-label={`Rated ${p.rating} out of 5`}>
                      {p.rating.toFixed(1)} <Star size={11} aria-hidden="true" fill="currentColor" />
                    </span>
                  ) : null}
                </div>
                <div className="cuisines">{p.sub}</div>
                <div className="meta-row">
                  {typeof p.distanceKm === "number" ? (
                    <span><MapPin size={13} aria-hidden="true" /> {p.distanceKm.toFixed(1)} km</span>
                  ) : null}
                  <span><Clock size={13} aria-hidden="true" /> {LIVE_MODE ? "real expiry" : "pickup tonight"}</span>
                </div>
                {lots.map(({ lot, remaining }) => {
                  const urgent = remaining < 60 * 60000;
                  const critical = remaining < 30 * 60000;
                  return (
                    <div key={lot.id} className="lot">
                      <span className={`veg-dot${lot.veg ? "" : " nonveg"}`} role="img" aria-label={lot.veg ? "veg" : "non-veg"} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                          <span className="qty num">{lot.quantity}</span>
                          <span className="what">{lot.unit} · {lot.item}</span>
                        </div>
                        <div className={`countdown${critical ? " critical" : urgent ? " urgent" : ""}`} aria-label={`Expires in ${formatCountdown(remaining)}`}>
                          {formatCountdown(remaining)} left
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={loading}
                        onClick={() => rescue(p.id, lot)}
                      >
                        {loading ? "…" : "Rescue"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      )}
      <p className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 14 }}>
        {LIVE_MODE
          ? "Live lots from POST /api/foodbridge/surplus registry · countdowns are true expiries · “Rescue” consumes the lot — rescuing twice surfaces the 409 state."
          : "Demo inventory simulated locally · countdowns tick from page load · “Rescue” dispatches a real agent workflow visible in Replay and the 3D scene."}
      </p>
    </Section>
  );
}

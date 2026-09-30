import { SURPLUS_PARTNERS } from "./mock-adapter";

export interface ParsedCommand {
  restaurant_id?: string;
  restaurantName?: string;
  item?: string;
  quantity?: number;
  unit?: string;
  max_distance_km?: number;
  notes: string[];
  errors: string[];
}

const RESTAURANT_KEYS: Array<{ keys: string[]; id: string }> = [
  { keys: ["meghana"], id: "r-meghana" },
  { keys: ["truffle"], id: "r-truffles" },
  { keys: ["adyar", "ananda", "a2b"], id: "r-a2b" },
  { keys: ["theobroma"], id: "r-theobroma" },
  { keys: ["eatfit", "eat fit"], id: "r-eatfit" },
];

const ITEM_KEYS: Array<{ keys: string[]; item: string; unit: string }> = [
  { keys: ["biryani", "biriyani"], item: "Chicken Dum Biryani", unit: "meals" },
  { keys: ["thali", "mini meals", "south indian"], item: "South Mini Meals", unit: "meals" },
  { keys: ["burger", "slider"], item: "Crispy Paneer Burgers", unit: "pcs" },
  { keys: ["buddha", "bowl"], item: "Buddha Bowls", unit: "meals" },
  { keys: ["croissant"], item: "Butter Croissants", unit: "pcs" },
  { keys: ["sourdough", "bread", "loaf", "loaves"], item: "Sourdough Loaves", unit: "loaves" },
];

const UNIT_WORDS: Record<string, string> = {
  meal: "meals",
  meals: "meals",
  pc: "pcs",
  pcs: "pcs",
  piece: "pcs",
  pieces: "pcs",
  tray: "trays",
  trays: "trays",
  loaf: "loaves",
  loaves: "loaves",
  plate: "plates",
  plates: "plates",
  bowl: "meals",
  bowls: "meals",
  portion: "portions",
  portions: "portions",
};

/**
 * Manus-style plain-English dispatch: "rescue 30 biryani from Meghana
 * within 5 km" → structured MatchRequest fields with transparent notes.
 * Never guesses silently — gaps become notes or blocking errors.
 */
export function parseCommand(input: string): ParsedCommand {
  const notes: string[] = [];
  const errors: string[] = [];
  const text = input.toLowerCase();

  let restaurant_id: string | undefined;
  for (const r of RESTAURANT_KEYS) {
    if (r.keys.some((k) => text.includes(k))) {
      restaurant_id = r.id;
      break;
    }
  }

  let item: string | undefined;
  let unit: string | undefined;
  for (const it of ITEM_KEYS) {
    if (it.keys.some((k) => text.includes(k))) {
      item = it.item;
      unit = it.unit;
      break;
    }
  }

  let quantity: number | undefined;
  const qtyMatch = text.match(/(\d+)\s*(meals?|pcs?|pieces?|trays?|loaves|loafs?|plates?|bowls?|portions?)?/);
  if (qtyMatch) {
    quantity = Number(qtyMatch[1]);
    const word = (qtyMatch[2] ?? "").toLowerCase();
    if (word && UNIT_WORDS[word]) {
      unit = UNIT_WORDS[word];
    } else if (!unit) {
      unit = "meals";
      notes.push("No unit named — assuming meals.");
    }
  } else {
    errors.push("How many? Name a quantity, e.g. “30 biryani”.");
  }

  let max_distance_km: number | undefined;
  const distMatch = text.match(/(?:within|under|inside|max)\s*(\d+)\s*km|(\d+)\s*km/);
  if (distMatch) {
    max_distance_km = Number(distMatch[1] ?? distMatch[2]);
  } else {
    max_distance_km = 8;
    notes.push("No radius named — using 8 km.");
  }

  if (!restaurant_id && item) {
    const home = SURPLUS_PARTNERS.find((p) => p.lots.some((l) => l.item === item));
    if (home) {
      restaurant_id = home.id;
      notes.push(`No restaurant named — ${item} is live at ${home.name}, using it.`);
    }
  }
  if (restaurant_id && !item) {
    const home = SURPLUS_PARTNERS.find((p) => p.id === restaurant_id);
    const lot = home?.lots[0];
    if (lot) {
      item = lot.item;
      if (!unit) unit = lot.unit;
      notes.push(`No dish named — using ${home?.name}'s live lot: ${lot.item}.`);
    }
  }

  const restaurantName = restaurant_id
    ? (SURPLUS_PARTNERS.find((p) => p.id === restaurant_id)?.name ?? restaurant_id)
    : undefined;
  if (!restaurant_id) errors.push("Which restaurant? Try Meghana, Truffles, A2B, Theobroma, or EatFit.");
  if (!item) errors.push("Which dish? Try biryani, thali, burgers, bowls, croissants, or sourdough.");

  return { restaurant_id, restaurantName, item, quantity, unit, max_distance_km, notes, errors };
}

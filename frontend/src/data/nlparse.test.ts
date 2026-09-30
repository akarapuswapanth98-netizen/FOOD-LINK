import { describe, expect, it } from "vitest";
import { parseCommand } from "./nlparse";

describe("parseCommand", () => {
  it("parses a full rescue order", () => {
    const p = parseCommand("Rescue 30 biryani from Meghana within 5 km");
    expect(p.quantity).toBe(30);
    expect(p.item).toBe("Chicken Dum Biryani");
    expect(p.restaurant_id).toBe("r-meghana");
    expect(p.max_distance_km).toBe(5);
    expect(p.errors).toEqual([]);
  });
  it("infers restaurant from dish", () => {
    const p = parseCommand("40 croissants");
    expect(p.restaurant_id).toBe("r-theobroma");
    expect(p.notes.length).toBeGreaterThan(0);
  });
  it("infers dish from restaurant lot", () => {
    const p = parseCommand("25 meals from Truffles");
    expect(p.item).toBe("Crispy Paneer Burgers");
  });
  it("blocks on missing quantity", () => {
    const p = parseCommand("biryani from Meghana");
    expect(p.errors.length).toBeGreaterThan(0);
  });
  it("blocks on unknown restaurant and dish", () => {
    const p = parseCommand("10 snacks from nowhere");
    expect(p.errors.length).toBeGreaterThan(0);
    expect(p.restaurant_id).toBeUndefined();
  });
  it("defaults radius with a note", () => {
    const p = parseCommand("30 biryani from Meghana");
    expect(p.max_distance_km).toBe(8);
    expect(p.notes.join(" ")).toMatch(/radius/i);
  });
});

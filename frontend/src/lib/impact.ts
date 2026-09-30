/* FOODLINK AI — shared impact math (single source of truth).
   Methodology (disclosed in the Impact section):
   - diverted weight = allocated quantity × 0.45 kg average portion
   - CO₂e avoided = weight × 2.5 kg CO₂e/kg (EPA WARM-inspired estimate) */

export const KG_PER_MEAL = 0.45;
export const CO2E_PER_KG = 2.5;

export function portionWeightKg(quantity: number): number {
  return Math.round(quantity * KG_PER_MEAL * 10) / 10;
}

export function co2AvoidedKg(weightKg: number): number {
  return Math.round(weightKg * CO2E_PER_KG * 10) / 10;
}

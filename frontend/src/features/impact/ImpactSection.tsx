import { Leaf, Users, Package, Truck } from "lucide-react";
import { useFoodlinkStore } from "../../store/useFoodlinkStore";
import { Section } from "../../components/Chrome";
import { EmptyState, Metric, SectionHead } from "../../components/ui";
import { formatNum } from "../../lib/format";

/** Impact — derived metrics only, with a methodology disclosure. */
export function ImpactSection(): React.JSX.Element {
  const workflow = useFoodlinkStore((s) => s.workflow);
  const source = useFoodlinkStore((s) => s.source);
  const sum = workflow?.summary;

  const partners = new Set((workflow?.allocations ?? []).map((a) => a.destinationId)).size;

  return (
    <Section id="impact">
      <SectionHead
        eyebrow="08 · Impact metrics"
        title="What the rescue actually achieved."
        lede="Impact is computed from confirmed allocations in the current workflow. Derived figures carry their methodology — no black-box numbers."
      />
      {!sum ? (
        <EmptyState
          title="No impact recorded yet"
          body="Complete a match workflow and impact will be calculated here from verified allocations — meals, weight diverted, deliveries, and partners served."
        />
      ) : (
        <>
          <div className="grid-4">
            <Metric value={formatNum(sum.mealsRescued)} label="Meals rescued" sub="sum of allocated quantities" />
            <Metric value={`${formatNum(sum.weightKg)} kg`} label="Food diverted" sub="from landfill" />
            <Metric value={String(sum.confirmedCount)} label="Deliveries confirmed" sub={`of ${sum.allocationsCount} allocations`} />
            <Metric value={String(partners)} label="Partners served" sub="destinations in this workflow" />
            <Metric value={formatNum(sum.allocationsCount)} label="Allocations" sub="negotiated by agents" />
            <Metric value={`${formatNum(sum.co2AvoidedKg)} kg`} label="CO₂e avoided (est.)" sub="see methodology" />
            <Metric value={`${formatNum(sum.totalQuantity)} ${sum.unit}`} label="Total quantity" sub="across allocations" />
            <Metric value={source === "demo" ? "demo" : "live"} label="Data source" sub={source === "demo" ? "simulated locally" : "backend response"} />
          </div>
          <div className="panel panel-inner" style={{ marginTop: 16, display: "flex", gap: 12 }}>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", color: "var(--ink-3)" }}>
              <Package size={16} aria-hidden="true" />
              <Truck size={16} aria-hidden="true" />
              <Users size={16} aria-hidden="true" />
              <Leaf size={16} aria-hidden="true" />
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--ink-2)" }}>
              <strong style={{ color: "var(--ink-0)" }}>How calculated.</strong> Meals rescued =
              allocated quantity (1 unit = 1 meal for meal-tray items). Weight diverted = quantity ×
              0.45 kg average portion. CO₂e avoided = weight × 2.5 kg CO₂e/kg, an estimate inspired
              by EPA WARM factors for diverted food waste — directional, not audited. Deliveries and
              partners count confirmed allocations and distinct destinations in this workflow only.
            </p>
          </div>
        </>
      )}
    </Section>
  );
}

import { AGENT_ORDER } from "../../data/schemas";
import { AGENT_LAYOUT } from "../../scene/agentLayout";
import { Section } from "../../components/Chrome";
import { AgentIcon, SectionHead } from "../../components/ui";

const STEPS: Array<{ phase: string; agent: (typeof AGENT_ORDER)[number]; text: string }> = [
  { phase: "Detect", agent: "restaurant", text: "The Restaurant Agent publishes surplus — item, quantity, and expiry — the moment it is detected." },
  { phase: "Match", agent: "matching", text: "The Matching Agent ranks compatible shelter demand by distance, need, and expiry fit." },
  { phase: "Negotiate", agent: "negotiation", text: "The Negotiation Agent resolves quantity splits and timing with shelter counterparts." },
  { phase: "Hand off", agent: "shelter", text: "The Shelter Agent confirms capacity and accepts its allocation into intake." },
  { phase: "Deliver", agent: "logistics", text: "The Logistics Agent sequences pickup, transit, and handoff — then dispatches." },
  { phase: "Verify", agent: "verification", text: "The Verification Agent confirms receipt and records measurable impact." },
];

export function HowItWorks(): React.JSX.Element {
  const colorOf = (kind: (typeof AGENT_ORDER)[number]): string =>
    AGENT_LAYOUT.find((l) => l.kind === kind)?.color ?? "#22d3ee";
  return (
    <Section id="how">
      <SectionHead
        eyebrow="10 · How it works"
        title="Detect → Match → Negotiate → Hand Off → Deliver → Verify."
        lede="The same six agents, names, and colors you see live — explained as the pipeline they execute."
      />
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        {STEPS.map((s, i) => (
          <li key={s.phase} className="panel panel-inner card-hover">
            <div className="mono" style={{ fontSize: 11, letterSpacing: "0.2em", color: "var(--ink-3)" }}>
              STEP {i + 1} · {s.phase.toUpperCase()}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "12px 0 8px" }}>
              <span className="agent-ico">
                <AgentIcon agent={s.agent} color={colorOf(s.agent)} />
              </span>
              <strong style={{ color: "var(--ink-0)", fontSize: 15 }}>
                {AGENT_LAYOUT.find((l) => l.kind === s.agent)?.label}
              </strong>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: "var(--ink-2)" }}>{s.text}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

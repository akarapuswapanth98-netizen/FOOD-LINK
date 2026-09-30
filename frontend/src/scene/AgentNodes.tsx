import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { AGENT_LAYOUT } from "./agentLayout";
import type { AgentKind, AgentStatus } from "../data/schemas";
import type { AgentDisplay } from "../lib/agents";

interface NodesProps {
  displays: AgentDisplay[];
  selected: AgentKind | null;
  onSelect: (a: AgentKind) => void;
  motionOK: boolean;
  dimInactive: boolean;
}

function easeOutBack(x: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const t = Math.min(1, Math.max(0, x));
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function statusColorOf(status: AgentStatus, accent: THREE.Color): THREE.Color {
  if (status === "failed") return new THREE.Color("#f87171");
  if (status === "warning") return new THREE.Color("#fbbf24");
  if (status === "completed") return new THREE.Color("#34d399");
  return accent;
}

/* ---------------- Node shell: reveal, halo, ground glow, selection ---------------- */

function NodeShell({
  index,
  position,
  accent,
  status,
  selected,
  dimmed,
  motionOK,
  onSelect,
  kind,
  children,
}: {
  index: number;
  position: [number, number, number];
  accent: THREE.Color;
  status: AgentStatus;
  selected: boolean;
  dimmed: boolean;
  motionOK: boolean;
  onSelect: (a: AgentKind) => void;
  kind: AgentKind;
  children: React.ReactNode;
}): React.JSX.Element {
  const group = useRef<THREE.Group>(null!);
  const halo = useRef<THREE.PointLight>(null!);
  const disc = useRef<THREE.MeshBasicMaterial>(null!);
  const boost = useRef(0);
  const prev = useRef(status);
  const color = useMemo(() => statusColorOf(status, accent), [status, accent]);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const appear = motionOK ? easeOutBack((t - 0.25 - index * 0.16) / 0.8) : 1;
    if (prev.current !== status) {
      prev.current = status;
      boost.current = 1;
    }
    boost.current = Math.max(0, boost.current - delta * 1.6);
    const busy = status === "processing" || status === "listening";
    const idle = motionOK && busy ? Math.sin(t * 2.4 + index * 1.7) * 0.05 : 0;
    g.scale.setScalar(Math.max(0.001, appear) * (1 + idle + boost.current * 0.3));
    if (halo.current) {
      halo.current.color.copy(color);
      const target = (status === "idle" ? 3 : 10) + boost.current * 16 + (selected ? 7 : 0);
      halo.current.intensity = THREE.MathUtils.damp(halo.current.intensity, target, 6, delta);
    }
    if (disc.current) {
      disc.current.color.copy(color);
      disc.current.opacity = THREE.MathUtils.damp(
        disc.current.opacity,
        (dimmed ? 0.06 : 0.16) + boost.current * 0.25 + (selected ? 0.12 : 0),
        6,
        delta,
      );
    }
  });

  return (
    <group position={position}>
      <group
        ref={group}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(kind);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
      >
        {children}
        {/* ground glow disc */}
        <mesh position={[0, -0.98, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.2, 36]} />
          <meshBasicMaterial ref={disc} color={accent} transparent opacity={0.14} depthWrite={false} />
        </mesh>
        {/* selection ring */}
        {selected ? (
          <mesh position={[0, -0.96, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.32, 1.42, 48]} />
            <meshBasicMaterial color="#ffd166" transparent opacity={0.9} depthWrite={false} />
          </mesh>
        ) : null}
        <pointLight ref={halo} position={[0, 0.7, 0]} distance={9} decay={2} intensity={4} />
      </group>
    </group>
  );
}

/* ---------------- Food / logistics glyphs ---------------- */

/** Restaurant: serving cloche on a steel plate — the surplus source. */
function ClocheGlyph({ active, accent }: { active: boolean; accent: THREE.Color }): React.JSX.Element {
  const dome = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (dome.current) dome.current.position.y = -0.26 + Math.sin(state.clock.elapsedTime * 1.6) * (active ? 0.05 : 0.015);
  });
  return (
    <group>
      <mesh position={[0, -0.42, 0]}>
        <cylinderGeometry args={[0.66, 0.7, 0.09, 28]} />
        <meshStandardMaterial color="#8f9bb0" metalness={0.9} roughness={0.32} />
      </mesh>
      <mesh ref={dome} position={[0, -0.26, 0]}>
        <sphereGeometry args={[0.46, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial
          color="#3a2208"
          metalness={0.65}
          roughness={0.28}
          clearcoat={1}
          emissive={accent}
          emissiveIntensity={active ? 1.5 : 0.7}
        />
      </mesh>
      <mesh position={[0, 0.24, 0]}>
        <sphereGeometry args={[0.07, 14, 14]} />
        <meshStandardMaterial color="#ffd166" emissive={accent} emissiveIntensity={2} />
      </mesh>
    </group>
  );
}

/** Matching: indigo AI core with dual orbit rings. */
function CoreGlyph({ active, accent }: { active: boolean; accent: THREE.Color }): React.JSX.Element {
  const r1 = useRef<THREE.Mesh>(null!);
  const r2 = useRef<THREE.Mesh>(null!);
  const core = useRef<THREE.MeshPhysicalMaterial>(null!);
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (r1.current) r1.current.rotation.z += delta * (active ? 1.1 : 0.25);
    if (r2.current) r2.current.rotation.z -= delta * (active ? 0.8 : 0.18);
    if (core.current) {
      core.current.emissiveIntensity = (active ? 1.5 : 0.7) + Math.sin(t * 2.2) * (active ? 0.35 : 0.08);
    }
  });
  return (
    <group>
      <mesh>
        <icosahedronGeometry args={[0.5, 1]} />
        <meshPhysicalMaterial
          ref={core}
          color="#141a33"
          roughness={0.22}
          metalness={0.4}
          clearcoat={1}
          emissive={accent}
          emissiveIntensity={0.8}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.15, 18, 18]} />
        <meshStandardMaterial color="#ffffff" emissive={accent} emissiveIntensity={2.4} />
      </mesh>
      <mesh ref={r1} rotation={[Math.PI / 2.3, 0.2, 0]}>
        <torusGeometry args={[0.88, 0.024, 10, 56]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.2} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh ref={r2} rotation={[Math.PI / 1.7, -0.4, 0.3]}>
        <torusGeometry args={[1.06, 0.016, 10, 56]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.7} transparent opacity={0.8} metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}

/** Shelter: little community house with lit windows. */
function HouseGlyph({ active, accent }: { active: boolean; accent: THREE.Color }): React.JSX.Element {
  return (
    <group>
      <mesh position={[0, -0.16, 0]}>
        <boxGeometry args={[0.78, 0.56, 0.66]} />
        <meshStandardMaterial color="#0f2c22" roughness={0.7} metalness={0.15} emissive={accent} emissiveIntensity={active ? 0.35 : 0.12} />
      </mesh>
      <mesh position={[0, 0.32, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.66, 0.44, 4]} />
        <meshStandardMaterial color="#134434" roughness={0.6} metalness={0.2} emissive={accent} emissiveIntensity={active ? 0.4 : 0.15} />
      </mesh>
      {/* lit door + window */}
      <mesh position={[-0.16, -0.2, 0.335]}>
        <planeGeometry args={[0.2, 0.32]} />
        <meshStandardMaterial color="#201304" emissive="#ffd166" emissiveIntensity={active ? 2 : 1} />
      </mesh>
      <mesh position={[0.2, -0.08, 0.335]}>
        <planeGeometry args={[0.18, 0.16]} />
        <meshStandardMaterial color="#201304" emissive={accent} emissiveIntensity={active ? 1.8 : 0.9} />
      </mesh>
    </group>
  );
}

/** Negotiation: balance scales that level out when the deal is agreed. */
function ScalesGlyph({
  done,
  motionOK,
  accent,
}: {
  done: boolean;
  motionOK: boolean;
  accent: THREE.Color;
}): React.JSX.Element {
  const beam = useRef<THREE.Group>(null!);
  useFrame((state, delta) => {
    if (!beam.current) return;
    const target = done ? 0 : motionOK ? Math.sin(state.clock.elapsedTime * 1.8) * 0.16 : 0.16;
    beam.current.rotation.z = THREE.MathUtils.damp(beam.current.rotation.z, target, 4, delta);
  });
  const pan = (x: number): React.JSX.Element => (
    <group position={[x, 0, 0]}>
      <mesh position={[0, -0.18, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.36, 6]} />
        <meshStandardMaterial color="#8f9bb0" metalness={0.8} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.38, 0]}>
        <cylinderGeometry args={[0.2, 0.14, 0.07, 18]} />
        <meshStandardMaterial color="#2a2138" metalness={0.5} roughness={0.4} emissive={accent} emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
  return (
    <group>
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.16, 0.2, 0.08, 16]} />
        <meshStandardMaterial color="#2a2138" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 1.0, 10]} />
        <meshStandardMaterial color="#8f9bb0" metalness={0.8} roughness={0.35} />
      </mesh>
      <group ref={beam} position={[0, 0.42, 0]}>
        <mesh>
          <boxGeometry args={[1.3, 0.05, 0.05]} />
          <meshStandardMaterial color="#f9a8d4" emissive={accent} emissiveIntensity={1.1} metalness={0.6} roughness={0.35} />
        </mesh>
        {pan(-0.6)}
        {pan(0.6)}
      </group>
    </group>
  );
}

/** Logistics: delivery van with spinning wheels when en route. */
function VanGlyph({ active, accent }: { active: boolean; accent: THREE.Color }): React.JSX.Element {
  const w1 = useRef<THREE.Group>(null!);
  const w2 = useRef<THREE.Group>(null!);
  const w3 = useRef<THREE.Group>(null!);
  const w4 = useRef<THREE.Group>(null!);
  useFrame((_, delta) => {
    if (!active) return;
    for (const w of [w1, w2, w3, w4]) {
      if (w.current) w.current.rotation.z -= delta * 6;
    }
  });
  const wheel = (x: number, z: number, ref: React.Ref<THREE.Group>): React.JSX.Element => (
    <group position={[x, -0.34, z]} ref={ref}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.17, 0.17, 0.1, 18]} />
        <meshStandardMaterial color="#0c0f16" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0, z > 0 ? 0.055 : -0.055]}>
        <boxGeometry args={[0.22, 0.045, 0.02]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.4} />
      </mesh>
    </group>
  );
  return (
    <group>
      {/* cargo box */}
      <mesh position={[-0.22, 0.08, 0]}>
        <boxGeometry args={[0.72, 0.5, 0.52]} />
        <meshStandardMaterial color="#12294d" roughness={0.5} metalness={0.3} emissive={accent} emissiveIntensity={active ? 0.5 : 0.15} />
      </mesh>
      {/* cab */}
      <mesh position={[0.4, 0.0, 0]}>
        <boxGeometry args={[0.4, 0.34, 0.5]} />
        <meshStandardMaterial color="#1b3a6b" roughness={0.45} metalness={0.35} />
      </mesh>
      {/* windshield */}
      <mesh position={[0.52, 0.06, 0]} rotation={[0, 0, -0.35]}>
        <planeGeometry args={[0.2, 0.3]} />
        <meshStandardMaterial color="#0a1424" emissive={accent} emissiveIntensity={active ? 1.6 : 0.7} />
      </mesh>
      {/* headlight */}
      <mesh position={[0.62, -0.12, 0.12]}>
        <sphereGeometry args={[0.05, 10, 10]} />
        <meshStandardMaterial color="#fff7d6" emissive="#ffe9a3" emissiveIntensity={2.4} />
      </mesh>
      {wheel(-0.32, 0.28, w1)}
      {wheel(-0.32, -0.28, w2)}
      {wheel(0.38, 0.28, w3)}
      {wheel(0.38, -0.28, w4)}
    </group>
  );
}

/** Verification: stamped quality badge with a check. */
function BadgeGlyph({ done, motionOK, accent }: { done: boolean; motionOK: boolean; accent: THREE.Color }): React.JSX.Element {
  const coin = useRef<THREE.Group>(null!);
  useFrame((_state, delta) => {
    if (coin.current && motionOK && (done || true)) {
      coin.current.rotation.y += delta * (done ? 1.4 : 0.35);
    }
  });
  return (
    <group ref={coin}>
      <mesh rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.44, 0.44, 0.12, 28]} />
        <meshStandardMaterial color="#0d2b21" metalness={0.7} roughness={0.3} emissive={accent} emissiveIntensity={done ? 1.1 : 0.45} />
      </mesh>
      <mesh position={[0, 0, 0.065]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.32, 0.028, 10, 40]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.6} />
      </mesh>
      {/* check mark */}
      <mesh position={[-0.08, -0.02, 0.07]} rotation={[0, 0, 0.75]}>
        <boxGeometry args={[0.2, 0.06, 0.03]} />
        <meshStandardMaterial color="#eafff5" emissive={accent} emissiveIntensity={1.8} />
      </mesh>
      <mesh position={[0.1, 0.05, 0.07]} rotation={[0, 0, -0.7]}>
        <boxGeometry args={[0.34, 0.06, 0.03]} />
        <meshStandardMaterial color="#eafff5" emissive={accent} emissiveIntensity={1.8} />
      </mesh>
    </group>
  );
}

/* ---------------- Assembly ---------------- */

// Module-scope accent palette: no per-render allocation, no hooks-in-loop.
const ACCENT_COLORS = Object.fromEntries(
  AGENT_LAYOUT.map((l) => [l.kind, new THREE.Color(l.color)]),
) as Record<AgentKind, THREE.Color>;

export function AgentNodes(props: NodesProps): React.JSX.Element {
  const byAgent = new Map(props.displays.map((d) => [d.agent, d]));
  return (
    <group>
      {AGENT_LAYOUT.map((l, i) => {
        const d = byAgent.get(l.kind);
        const status: AgentStatus = d?.status ?? "idle";
        const accent = ACCENT_COLORS[l.kind];
        const active = status === "processing" || status === "listening";
        const done = status === "completed";
        return (
          <NodeShell
            key={l.kind}
            index={i}
            position={l.position}
            accent={accent}
            status={status}
            selected={props.selected === l.kind}
            dimmed={props.dimInactive}
            motionOK={props.motionOK}
            onSelect={props.onSelect}
            kind={l.kind}
          >
            {l.kind === "restaurant" ? <ClocheGlyph active={active} accent={accent} /> : null}
            {l.kind === "matching" ? <CoreGlyph active={active} accent={accent} /> : null}
            {l.kind === "shelter" ? <HouseGlyph active={active} accent={accent} /> : null}
            {l.kind === "negotiation" ? <ScalesGlyph done={done} motionOK={props.motionOK} accent={accent} /> : null}
            {l.kind === "logistics" ? <VanGlyph active={active} accent={accent} /> : null}
            {l.kind === "verification" ? <BadgeGlyph done={done} motionOK={props.motionOK} accent={accent} /> : null}
          </NodeShell>
        );
      })}
    </group>
  );
}

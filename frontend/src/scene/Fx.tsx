import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LAYOUT_BY_AGENT, positionOf } from "./agentLayout";
import type { AgentEvent, AgentKind } from "../data/schemas";

/** Warm light that follows the visitor's cursor.
 *  Fully off (not parked-and-dimming, fully unmounted) under reduced
 *  motion, and fully static on touch devices. */
export function CursorLight({ motionOK }: { motionOK: boolean }): React.JSX.Element {
  const ref = useRef<THREE.PointLight>(null!);
  const target = useMemo(() => new THREE.Vector3(0, 3, 4.5), []);
  const finePointer = useMemo(
    () =>
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function" ||
      window.matchMedia("(pointer: fine)").matches,
    [],
  );
  useFrame((state, delta) => {
    if (!motionOK || !finePointer) return; // reduced motion: frozen; touch: parked
    const p = state.pointer;
    target.set(p.x * 7, 3.2 + -p.y * 2.5, 4.5);
    ref.current.position.x = THREE.MathUtils.damp(ref.current.position.x, target.x, 3, delta);
    ref.current.position.y = THREE.MathUtils.damp(ref.current.position.y, target.y, 3, delta);
    ref.current.position.z = THREE.MathUtils.damp(ref.current.position.z, target.z, 3, delta);
  });
  return <pointLight ref={ref} color="#ffd7db" intensity={8} distance={16} decay={2} />;
}

function Wave({
  kind,
  color,
  onDone,
}: {
  kind: AgentKind;
  color: string;
  onDone: () => void;
}): React.JSX.Element {
  const ref = useRef<THREE.Mesh>(null!);
  const mat = useRef<THREE.MeshBasicMaterial>(null!);
  const t = useRef(0);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);
  const [x, , z] = positionOf(kind);
  useFrame((_state, delta) => {
    t.current += delta;
    const k = t.current / 1.1;
    if (k >= 1) {
      done.current();
      return;
    }
    ref.current.scale.setScalar(0.4 + k * 2.6);
    mat.current.opacity = 0.55 * (1 - k);
  });
  return (
    <mesh ref={ref} position={[x, -0.9, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.9, 1.0, 48]} />
      <meshBasicMaterial
        ref={mat}
        color={color}
        transparent
        opacity={0.55}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/**
 * Event shockwaves: every newly revealed agent event emits one expanding
 * ring at its agent's feet. Scrub-jumps emit a single wave, never a burst.
 * Fully disabled under reduced motion.
 */
export function Shockwaves({
  events,
  motionOK,
}: {
  events: AgentEvent[];
  motionOK: boolean;
}): React.JSX.Element {
  const [waves, setWaves] = useState<Array<{ id: number; kind: AgentKind; color: string }>>([]);
  const prev = useRef(events.length);
  const idRef = useRef(0);

  useEffect(() => {
    if (!motionOK) {
      prev.current = events.length;
      return;
    }
    if (events.length > prev.current) {
      const last = events[events.length - 1];
      prev.current = events.length;
      const id = ++idRef.current;
      const color = LAYOUT_BY_AGENT[last.agent]?.color ?? "#38bdf8";
      setWaves((w) => [...w.slice(-5), { id, kind: last.agent, color }]);
    } else {
      prev.current = events.length;
    }
  }, [events.length, events, motionOK]);

  if (!motionOK) return <group />;
  return (
    <group>
      {waves.map((w) => (
        <Wave
          key={w.id}
          kind={w.kind}
          color={w.color}
          onDone={() => setWaves((cur) => cur.filter((x) => x.id !== w.id))}
        />
      ))}
    </group>
  );
}

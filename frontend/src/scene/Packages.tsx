import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DELIVERY_PATH, positionOf } from "./agentLayout";

/** Tiffin carriers — stacked steel lunch tins with a saffron seal — run the route. */
function Tiffin(): React.JSX.Element {
  return (
    <group>
      {[0, 0.095, 0.19].map((y, i) => (
        <mesh key={i} position={[0, y - 0.09, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.085, 20]} />
          <meshStandardMaterial color="#aeb9c9" metalness={0.9} roughness={0.32} />
        </mesh>
      ))}
      {/* tomato seal band */}
      <mesh position={[0, 0.005, 0]}>
        <cylinderGeometry args={[0.158, 0.158, 0.035, 20]} />
        <meshStandardMaterial color="#3a0d14" emissive="#ff5c6c" emissiveIntensity={1.6} roughness={0.5} />
      </mesh>
      {/* lid + knob */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.03, 20]} />
        <meshStandardMaterial color="#8f9bb0" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.185, 0]}>
        <sphereGeometry args={[0.035, 10, 10]} />
        <meshStandardMaterial color="#ffd166" emissive="#ff5c6c" emissiveIntensity={2} />
      </mesh>
    </group>
  );
}

export function Packages({
  enabled,
  motionOK,
  running,
}: {
  enabled: boolean;
  motionOK: boolean;
  running: boolean;
}): React.JSX.Element {
  const curves = useMemo(() => {
    const list: THREE.CatmullRomCurve3[] = [];
    for (let i = 0; i < DELIVERY_PATH.length - 1; i++) {
      const a = new THREE.Vector3(...positionOf(DELIVERY_PATH[i]));
      const b = new THREE.Vector3(...positionOf(DELIVERY_PATH[i + 1]));
      const mid = a.clone().lerp(b, 0.5);
      mid.y += 1.15;
      list.push(new THREE.CatmullRomCurve3([a, mid, b]));
    }
    return list;
  }, []);

  const g0 = useRef<THREE.Group>(null!);
  const g1 = useRef<THREE.Group>(null!);
  const g2 = useRef<THREE.Group>(null!);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const groups = [g0, g1, g2];
  const speeds = [0.16, 0.12, 0.14];
  const offsets = [0, 0.45, 0.7];

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    groups.forEach((r, i) => {
      const g = r.current;
      if (!g || curves.length === 0) return;
      if (!motionOK) {
        // Reduced motion: rest tiffins at the confirmed destination.
        curves[curves.length - 1].getPoint(0.99, tmp);
        g.position.copy(tmp);
        g.position.x += i * 0.4;
        return;
      }
      const segFloat = running ? (t * speeds[i] + offsets[i]) % 1 : 0.985;
      const segCount = curves.length;
      const scaled = segFloat * segCount;
      const segIndex = Math.min(segCount - 1, Math.floor(scaled));
      const segT = scaled - segIndex;
      const eased = segT * segT * (3 - 2 * segT);
      curves[segIndex].getPoint(eased, tmp);
      g.position.copy(tmp);
      g.position.y += Math.sin(t * 3 + i * 2.1) * 0.05;
      g.rotation.y += delta * 1.2;
    });
  });

  if (!enabled) return <group />;

  return (
    <group>
      <group ref={g0}>
        <Tiffin />
      </group>
      <group ref={g1}>
        <Tiffin />
      </group>
      <group ref={g2}>
        <Tiffin />
      </group>
    </group>
  );
}

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { positionOf } from "./agentLayout";

/** Kitchen steam columns rising above the source and shelter hearths. */
export function Steam({ motionOK }: { motionOK: boolean }): React.JSX.Element {
  const N = 44;
  const seeds = useMemo(() => {
    const arr = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      arr[i * 3] = Math.random();
      arr[i * 3 + 1] = Math.random();
      arr[i * 3 + 2] = Math.random();
    }
    return arr;
  }, []);
  const positions = useMemo(() => new Float32Array(N * 3), []);
  const geo = useRef<THREE.BufferGeometry>(null!);
  const src = positionOf("restaurant");
  const shel = positionOf("shelter");

  useFrame((state) => {
    if (!motionOK) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < N; i++) {
      const s1 = seeds[i * 3];
      const s2 = seeds[i * 3 + 1];
      const s3 = seeds[i * 3 + 2];
      const half = i < N / 2;
      const baseX = half ? src[0] : shel[0];
      const baseY = (half ? src[1] : shel[1]) + 0.4;
      const baseZ = half ? src[2] : shel[2];
      const rise = ((t * 0.35 + s1 * 2.2) % 2.2);
      positions[i * 3] = baseX + Math.sin(t * 1.4 + s2 * 6.28) * 0.16 * rise + (s3 - 0.5) * 0.3;
      positions[i * 3 + 1] = baseY + rise;
      positions[i * 3 + 2] = baseZ + Math.cos(t * 1.1 + s2 * 6.28) * 0.12 * rise;
    }
    geo.current.attributes["position"].needsUpdate = true;
  });

  if (!motionOK) return <group />;

  return (
    <points>
      <bufferGeometry ref={geo}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.14} color="#ffd9a0" transparent opacity={0.3} depthWrite={false} />
    </points>
  );
}

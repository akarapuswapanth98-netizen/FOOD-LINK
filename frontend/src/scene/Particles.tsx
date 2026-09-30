import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** ~280 low-opacity ambient particles drifting slowly. */
export function Particles({ motionOK }: { motionOK: boolean }): React.JSX.Element {
  const ref = useRef<THREE.Points>(null!);
  const positions = useMemo(() => {
    const N = 280;
    const arr = new Float32Array(N * 3);
    let seed = 42;
    const rand = (): number => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < N; i++) {
      arr[i * 3] = (rand() - 0.5) * 30;
      arr[i * 3 + 1] = rand() * 8 - 1;
      arr[i * 3 + 2] = (rand() - 0.5) * 22;
    }
    return arr;
  }, []);

  useFrame((state, delta) => {
    if (!motionOK) return;
    const p = ref.current;
    if (!p) return;
    p.rotation.y += delta * 0.014;
    p.position.y = Math.sin(state.clock.elapsedTime * 0.18) * 0.18;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#67e8f9"
        transparent
        opacity={0.42}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * Night-market city ring: instanced low-poly blocks with warm rooftop
 * beacons, so the network reads as a living food district — not a roadmap.
 */
export function CityBlocks(): React.JSX.Element {
  const mesh = useRef<THREE.InstancedMesh>(null!);

  const blocks = useMemo(() => {
    const list: Array<{ x: number; z: number; w: number; d: number; h: number; warm: boolean }> = [];
    let seed = 7;
    const rand = (): number => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let gx = -7; gx <= 7; gx++) {
      for (let gz = -5; gz <= 5; gz++) {
        const x = gx * 2.1 + (rand() - 0.5) * 0.9;
        const z = gz * 2.2 - 1 + (rand() - 0.5) * 0.9;
        // Keep the operations clearing free.
        if (Math.abs(x) < 8.2 && z > -5.5 && z < 5.6) continue;
        if (rand() < 0.22) continue;
        list.push({
          x,
          z,
          w: 1.1 + rand() * 0.7,
          d: 1.1 + rand() * 0.7,
          h: 0.5 + rand() * rand() * 2.6,
          warm: rand() < 0.3,
        });
      }
    }
    return list.slice(0, 150);
  }, []);

  const beacons = useMemo(
    () =>
      blocks
        .filter((b) => b.h > 1.6)
        .slice(0, 10)
        .map((b) => ({ x: b.x, y: -1.4 + b.h + 0.08, z: b.z, warm: b.warm })),
    [blocks],
  );

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    const cool = new THREE.Color("#1a2140");
    const warm = new THREE.Color("#2b1d33");
    blocks.forEach((b, i) => {
      dummy.position.set(b.x, -1.4 + b.h / 2, b.z);
      dummy.scale.set(b.w, b.h, b.d);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, b.warm ? warm : cool);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [blocks]);

  return (
    <group>
      <instancedMesh ref={mesh} args={[undefined, undefined, blocks.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.9} metalness={0.1} />
      </instancedMesh>
      {beacons.map((b, i) => (
        <mesh key={i} position={[b.x, b.y, b.z]}>
          <sphereGeometry args={[0.06, 10, 10]} />
          <meshStandardMaterial
            color="#11131c"
            emissive={b.warm ? "#ff5c6c" : "#38bdf8"}
            emissiveIntensity={2.2}
          />
        </mesh>
      ))}
    </group>
  );
}

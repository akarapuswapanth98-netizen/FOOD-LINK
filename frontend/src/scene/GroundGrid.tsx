import { Grid } from "@react-three/drei";

/** Procedural ground grid with distance fade (drei Grid = shader-based, cheap). */
export function GroundGrid(): React.JSX.Element {
  return (
    <group>
      <Grid
        position={[0, -1.4, 0]}
        args={[44, 44]}
        cellSize={0.9}
        cellThickness={0.6}
        cellColor="#0e2a3d"
        sectionSize={4.5}
        sectionThickness={1.1}
        sectionColor="#155e75"
        fadeDistance={46}
        fadeStrength={2.4}
        infiniteGrid
      />
      {/* faint warm pool under source, cool pool under destination — semantic light */}
      <mesh position={[-5.6, -1.38, 1.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.6, 40]} />
        <meshBasicMaterial color="#ff5c6c" transparent opacity={0.06} depthWrite={false} />
      </mesh>
      <mesh position={[5.6, -1.38, 1.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.6, 40]} />
        <meshBasicMaterial color="#34d399" transparent opacity={0.05} depthWrite={false} />
      </mesh>
    </group>
  );
}

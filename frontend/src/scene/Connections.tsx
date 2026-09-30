import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { positionOf } from "./agentLayout";
import type { ConnectionState } from "../data/schemas";
import type { NetworkConnection } from "../data/schemas";

const STATE_COLOR: Record<ConnectionState, string> = {
  idle: "#2c3a58",
  active: "#38bdf8",
  confirmed: "#34d399",
  dimmed: "#3b4c63",
  severed: "#f87171",
};

const STATE_OPACITY: Record<ConnectionState, number> = {
  idle: 0.35,
  active: 0.95,
  confirmed: 1,
  dimmed: 0.35,
  severed: 0.9,
};

function curvePoints(from: [number, number, number], to: [number, number, number]): [number, number, number][] {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const mid = a.clone().lerp(b, 0.5);
  mid.y += 1.15;
  const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
  return curve.getPoints(36).map((p) => [p.x, p.y, p.z] as [number, number, number]);
}

function ConnectionLine({ conn, motionOK }: { conn: NetworkConnection; motionOK: boolean }): React.JSX.Element {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ref = useRef<any>(null);
  const points = useMemo(
    () => curvePoints(positionOf(conn.from), positionOf(conn.to)),
    [conn.from, conn.to],
  );
  const color = STATE_COLOR[conn.state];
  const severed = conn.state === "severed";

  useFrame((state, delta) => {
    const obj = ref.current as { material?: { dashOffset?: number; opacity?: number } } | null;
    if (!obj?.material) return;
    if (!motionOK) return;
    if (conn.state === "active") {
      if (typeof obj.material.dashOffset === "number") obj.material.dashOffset -= delta * 1.6;
      if (typeof obj.material.opacity === "number") {
        obj.material.opacity = 0.75 + Math.sin(state.clock.elapsedTime * 3.2) * 0.2;
      }
    } else if (conn.state === "failed" as ConnectionState) {
      void 0;
    }
  });

  if (conn.state === "idle" && conn.eventCount === 0) {
    return (
      <Line
        ref={ref}
        points={points}
        color={color}
        lineWidth={1}
        transparent
        opacity={0.22}
      />
    );
  }

  return (
    <group>
      {/* dim outer falloff */}
      <Line
        points={points}
        color={color}
        lineWidth={severed ? 2 : 4}
        transparent
        opacity={0.18}
      />
      {/* bright animated core */}
      <Line
        ref={ref}
        points={points}
        color={severed ? "#f87171" : conn.state === "confirmed" ? "#a7f3d0" : "#bae6fd"}
        lineWidth={severed ? 1.5 : 2}
        transparent
        opacity={STATE_OPACITY[conn.state]}
        dashed
        dashSize={severed ? 0.12 : 0.24}
        gapSize={severed ? 0.22 : 0.14}
      />
    </group>
  );
}

export function Connections({
  connections,
  motionOK,
}: {
  connections: NetworkConnection[];
  motionOK: boolean;
}): React.JSX.Element {
  if (connections.length === 0) return <group />;
  return (
    <group>
      {connections.map((c) => (
        <ConnectionLine key={c.id} conn={c} motionOK={motionOK} />
      ))}
    </group>
  );
}

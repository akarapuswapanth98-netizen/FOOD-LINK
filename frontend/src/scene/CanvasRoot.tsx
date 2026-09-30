import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Line, OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { AgentNodes } from "./AgentNodes";
import { Connections } from "./Connections";
import { Packages } from "./Packages";
import { Particles } from "./Particles";
import { GroundGrid } from "./GroundGrid";
import { CameraRig } from "./CameraRig";
import { CityBlocks } from "./CityBlocks";
import { Steam } from "./Steam";
import { CursorLight, Shockwaves } from "./Fx";
import { DELIVERY_PATH, positionOf } from "./agentLayout";
import type { WorkflowStatus } from "../data/schemas";
import { allAgentDisplays } from "../lib/agents";
import { useFoodlinkStore, useRevealedEvents } from "../store/useFoodlinkStore";

function SceneLights(): React.JSX.Element {
  return (
    <group>
      {/* dim warm-charcoal ambient base */}
      <ambientLight color="#a8b6d8" intensity={0.24} />
      <hemisphereLight args={["#1d2b4a", "#080b10", 0.55]} />
      {/* semantic accents with real falloff: sky mind, tomato hearth, leaf shelter */}
      <pointLight position={[0, 4.2, 2.2]} color="#38bdf8" intensity={30} distance={22} decay={2} />
      <pointLight position={[-5.6, 2.4, 1.6]} color="#ff5c6c" intensity={16} distance={14} decay={2} />
      <pointLight position={[-4.5, 2.5, 4]} color="#f472b6" intensity={10} distance={14} decay={2} />
      <pointLight position={[5.6, 2.2, 2.5]} color="#34d399" intensity={12} distance={15} decay={2} />
      <directionalLight position={[6, 10, 6]} color="#ffe3c2" intensity={0.45} />
    </group>
  );
}

/**
 * Ground-projected delivery route: the same path the tiffins fly,
 * glowing on the street level in the workflow's state color.
 */
function GroundRoute({
  status,
  motionOK,
}: {
  status: WorkflowStatus | undefined;
  motionOK: boolean;
}): React.JSX.Element {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ref = useRef<any>(null);
  const points = useMemo(
    () =>
      DELIVERY_PATH.map((k) => {
        const [x, , z] = positionOf(k);
        return [x, -1.32, z] as [number, number, number];
      }),
    [],
  );
  const color =
    status === "completed" || status === "partial"
      ? "#34d399"
      : status === "running" || status === "queued"
        ? "#ff5c6c"
        : "#2c3a58";
  useFrame((state) => {
    const m = ref.current?.material as { opacity?: number } | undefined;
    if (m && typeof m.opacity === "number" && motionOK && status === "running") {
      m.opacity = 0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.25;
    }
  });
  return (
    <Line
      ref={ref}
      points={points}
      color={color}
      lineWidth={2}
      transparent
      opacity={0.55}
      dashed
      dashSize={0.3}
      gapSize={0.2}
    />
  );
}

/** Slow halo breathing under the AI core — the district has a heartbeat. */
function HaloRing({ motionOK }: { motionOK: boolean }): React.JSX.Element {
  const ref = useRef<THREE.Mesh>(null!);
  const [x, , z] = positionOf("matching");
  useFrame((_state, delta) => {
    if (motionOK) ref.current.rotation.z += delta * 0.25;
  });
  return (
    <group position={[x, -1.3, z]}>
      <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.7, 1.78, 64]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.3} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.1, 2.13, 64]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.12} depthWrite={false} />
      </mesh>
    </group>
  );
}

/**
 * Cinematic information layer. Reads normalized workflow state from the store:
 * node glow = agent status, connection animation = event flow, packages =
 * confirmed route segments. Renders nothing invented — all props derive from
 * revealed events, allocations, and connection states.
 */
export function CanvasRoot({ className }: { className?: string }): React.JSX.Element {
  const workflow = useFoodlinkStore((s) => s.workflow);
  const selected = useFoodlinkStore((s) => s.selectedAgent);
  const selectAgent = useFoodlinkStore((s) => s.selectAgent);
  const motionPaused = useFoodlinkStore((s) => s.motionPaused);
  const explore = useFoodlinkStore((s) => s.explore3D);
  const revealed = useRevealedEvents();
  const [visible, setVisible] = useState(true);
  const host = useRef<HTMLDivElement>(null);

  const reduced =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const motionOK = !motionPaused && !reduced;

  // Pause expensive effects when the hero scene is offscreen.
  useEffect(() => {
    const el = host.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      const entry = entries[0];
      setVisible(entry ? entry.isIntersecting : true);
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const displays = allAgentDisplays(revealed);
  const status = workflow?.status;
  const dimInactive = status === "completed" || status === "partial";
  const packagesEnabled = (workflow?.allocations.length ?? 0) > 0;
  const running = status === "running" || status === "queued";

  return (
    <div ref={host} className={className} aria-hidden="true">
      <Canvas
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 6.4, 15], fov: 42, near: 0.1, far: 120 }}
        frameloop={visible ? "always" : "never"}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.12;
        }}
      >
        <color attach="background" args={["#080b10"]} />
        <fog attach="fog" args={["#080b10", 19, 46]} />
        <Suspense fallback={null}>
          <SceneLights />
          <GroundGrid />
          <CityBlocks />
          <Connections connections={workflow?.connections ?? []} motionOK={motionOK} />
          <GroundRoute status={workflow?.status} motionOK={motionOK} />
          <HaloRing motionOK={motionOK} />
          <Shockwaves events={revealed} motionOK={motionOK} />
          {motionOK ? <CursorLight motionOK={motionOK} /> : null}
          <AgentNodes
            displays={displays}
            selected={selected}
            onSelect={selectAgent}
            motionOK={motionOK}
            dimInactive={dimInactive}
          />
          <Packages enabled={packagesEnabled} motionOK={motionOK} running={running} />
          <Steam motionOK={motionOK} />
          <Particles motionOK={motionOK} />
          <CameraRig motionOK={motionOK} explore={explore} />
          {explore ? (
            <OrbitControls
              makeDefault
              enablePan={false}
              enableDamping
              minDistance={8}
              maxDistance={26}
              maxPolarAngle={Math.PI / 2.05}
            />
          ) : null}
          {motionOK && (
            <EffectComposer multisampling={0}>
              <Bloom
                mipmapBlur
                intensity={0.85}
                luminanceThreshold={0.55}
                luminanceSmoothing={0.2}
              />
              <Vignette eskil={false} offset={0.26} darkness={0.72} />
            </EffectComposer>
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}

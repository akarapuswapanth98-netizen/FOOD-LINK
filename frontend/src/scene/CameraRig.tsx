import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const HOME = new THREE.Vector3(0, 6.4, 15);
const LOOK = new THREE.Vector3(0, 1, 0);
const tmpTarget = new THREE.Vector3();

/** Slow 20s idle drift + mouse parallax + scroll dolly. Yields to explore mode. */
export function CameraRig({ motionOK, explore }: { motionOK: boolean; explore: boolean }): React.JSX.Element {
  const scroll = useRef(0);
  useEffect(() => {
    const onScroll = (): void => {
      scroll.current = Math.min(1, window.scrollY / (window.innerHeight * 1.1));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useFrame((state, delta) => {
    const cam = state.camera;
    if (explore) return; // user owns the camera via OrbitControls
    if (!motionOK) {
      tmpTarget.copy(HOME);
      cam.position.x = THREE.MathUtils.damp(cam.position.x, tmpTarget.x, 2, delta);
      cam.position.y = THREE.MathUtils.damp(cam.position.y, tmpTarget.y, 2, delta);
      cam.position.z = THREE.MathUtils.damp(cam.position.z, tmpTarget.z, 2, delta);
      cam.lookAt(LOOK);
      return;
    }
    const t = state.clock.elapsedTime;
    const drift = (t * Math.PI * 2) / 20;
    const p = state.pointer;
    tmpTarget.set(
      Math.sin(drift * 0.5) * 2.4 + p.x * 1.5,
      6.4 - scroll.current * 1.8 + Math.sin(drift) * 0.28 + -p.y * 0.7,
      HOME.z - scroll.current * 4.2 + Math.cos(drift * 0.5) * 1.4,
    );
    cam.position.x = THREE.MathUtils.damp(cam.position.x, tmpTarget.x, 1.6, delta);
    cam.position.y = THREE.MathUtils.damp(cam.position.y, tmpTarget.y, 1.6, delta);
    cam.position.z = THREE.MathUtils.damp(cam.position.z, tmpTarget.z, 1.6, delta);
    cam.lookAt(LOOK);
  });
  return <group />;
}

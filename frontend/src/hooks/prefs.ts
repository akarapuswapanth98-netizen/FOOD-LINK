import { useEffect, useState } from "react";
import { useFoodlinkStore } from "../store/useFoodlinkStore";

/** Tracks the OS reduced-motion preference. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (): void => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** Probe for WebGL availability (no-WebGL mode uses the DOM fallback). */
export function detectWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    return gl !== null;
  } catch {
    return false;
  }
}

/** Single motion gate: OS preference OR manual pause OR forced fallback freeze. */
export function useMotionAllowed(): boolean {
  const paused = useFoodlinkStore((s) => s.motionPaused);
  const reduced = usePrefersReducedMotion();
  return !paused && !reduced;
}

/** Listen for context loss so the app can switch to the DOM fallback live. */
export function useWebglContextLoss(onLost: () => void): void {
  useEffect(() => {
    const handler = (): void => onLost();
    window.addEventListener("webglcontextlost", handler);
    return () => window.removeEventListener("webglcontextlost", handler);
  }, [onLost]);
}

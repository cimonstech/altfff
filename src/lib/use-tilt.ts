"use client";

import { useEffect, type RefObject } from "react";
import { gsap } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";

/**
 * Cursor-follow 3D tilt: rotationX/rotationY on `tiltRef`, smoothed via
 * quickTo, tracking pointer position within `stageRef`. `stageRef` needs
 * `perspective` set in its own styles for the rotation to read as 3D.
 * Skipped under reduced motion and on coarse/touch pointers (no
 * persistent cursor position to track there).
 *
 * Uses rotationX/rotationY (GSAP's legacy transform props), not
 * rotateX/rotateY — the latter collide with the browser's independent CSS
 * `rotate` property (which can't express combined 3D rotation), causing
 * GSAP to silently drop the tween.
 */
export function useTilt(
  stageRef: RefObject<HTMLElement | null>,
  tiltRef: RefObject<HTMLElement | null>,
  { maxDeg = 6, duration = 0.6 }: { maxDeg?: number; duration?: number } = {},
) {
  useEffect(() => {
    const stage = stageRef.current;
    const tilt = tiltRef.current;
    if (!stage || !tilt) return;
    if (prefersReducedMotion()) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    gsap.set(tilt, { rotationX: 0, rotationY: 0, transformPerspective: 1000 });
    const setRotateX = gsap.quickTo(tilt, "rotationX", { duration, ease: "power3" });
    const setRotateY = gsap.quickTo(tilt, "rotationY", { duration, ease: "power3" });

    const onMove = (e: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      setRotateY((px - 0.5) * 2 * maxDeg);
      setRotateX((0.5 - py) * 2 * maxDeg);
    };
    const onLeave = () => {
      setRotateX(0);
      setRotateY(0);
    };

    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerleave", onLeave);
    return () => {
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxDeg, duration]);
}

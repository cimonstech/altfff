"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { prefersReducedMotion } from "@/lib/reduced-motion";

const ROTATION_SECONDS = 42; // one full turn every ~42s, within the 30-60s ask

/**
 * Ambient, ultra-lightweight Three.js mood element: a low-poly triangular
 * pyramid (evokes the Alt.FFF triangle/mountain motif) rendered as a plain
 * gold wireframe, rotating slowly behind the quote text. One geometry, no
 * lighting (unlit line material), so GPU/CPU cost stays negligible.
 *
 * Not mounted at all under prefers-reduced-motion (checked by the caller).
 * Rendering pauses via document.visibilitychange while the tab is hidden.
 */
export default function QuoteWireframe() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // Static fallback under reduced motion: simply don't mount the scene.
    if (prefersReducedMotion()) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 10);
    camera.position.z = 4;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Three.js can't consume a CSS var() reference directly (this is WebGL,
    // not the DOM) - resolve --gold to its actual value at runtime instead
    // of duplicating a hardcoded hex that could drift out of sync with the
    // token later.
    const goldHex = getComputedStyle(document.documentElement).getPropertyValue("--gold").trim();
    const geometry = new THREE.WireframeGeometry(new THREE.ConeGeometry(1.3, 2.2, 3));
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(goldHex),
      transparent: true,
      opacity: 0.32,
    });
    const wireframe = new THREE.LineSegments(geometry, material);
    scene.add(wireframe);

    const resize = () => {
      const { clientWidth, clientHeight } = container;
      if (clientWidth === 0 || clientHeight === 0) return;
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight);
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    let rafId: number | null = null;
    let lastTime = performance.now();
    const radiansPerMs = (Math.PI * 2) / (ROTATION_SECONDS * 1000);

    const tick = (time: number) => {
      const dt = time - lastTime;
      lastTime = time;
      wireframe.rotation.y += dt * radiansPerMs;
      wireframe.rotation.x += dt * radiansPerMs * 0.35;
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(tick);
    };

    const start = () => {
      if (rafId === null) {
        lastTime = performance.now();
        rafId = requestAnimationFrame(tick);
      }
    };
    const stop = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };
    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else start();
    };

    start();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      resizeObserver.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={containerRef} aria-hidden="true" className="pointer-events-none absolute inset-0" />;
}



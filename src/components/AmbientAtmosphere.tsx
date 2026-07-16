"use client";

/**
 * Ambient cursor-driven decoration for the map section: small material
 * artifacts (cowrie, raffia) drift near the cursor, cotton wisps float
 * independently, and a woven "kente thread" trail traces recent cursor
 * movement. Purely atmospheric — no informational value, so it's skipped
 * entirely under reduced motion or on touch-only devices, and every layer
 * is pointer-events: none so it can never intercept clicks meant for the
 * map paths or the stat numbers underneath it.
 *
 * Everything here is imperative DOM/GSAP (not React state) — artifacts are
 * created and destroyed dozens of times a minute while the cursor moves,
 * and routing that through re-renders would be wasteful for something this
 * disposable. The component's own render output never changes.
 */

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";

const COWRIE_SRC = "/materials/cowrie.png";
const RAFFIA_SRC = "/materials/raffia.png";
const KENTE_COLORS = ["#E0A122", "#2F5D3A", "#C8402F", "#171C26"];
// Rendered width range, px. Raffia reads ~20% larger than cowrie at both ends.
const COWRIE_SIZE: [number, number] = [20, 36];
const RAFFIA_SIZE: [number, number] = [24, 43.2];
const COTTON_COLOR = "#FFFFFF"; // deliberately off the --paper page background, not matching it

const MAX_ARTIFACTS = 10;
const SPAWN_MIN_MS = 150;
const SPAWN_MAX_MS = 300;
// Recent cursor history the thread keeps, capped by point count rather than
// a time window — at typical cursor speeds that reads the same and avoids
// stamping/filtering timestamps on every move.
const TRAIL_MAX_POINTS = 24;
const IDLE_MS = 180; // no movement for this long => thread starts settling

type Point = { x: number; y: number };

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

/** Simple quadratic-smoothed polyline through the given points. */
function buildPathD(pts: Point[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    d += ` Q ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
  return d;
}

export default function AmbientAtmosphere({
  containerRef,
}: {
  containerRef: React.RefObject<HTMLElement | null>;
}) {
  const layerRef = useRef<HTMLDivElement>(null);
  const trailGroupRef = useRef<SVGGElement>(null);
  const trailPathRefs = useRef<(SVGPathElement | null)[]>([]);

  useEffect(() => {
    const section = containerRef.current;
    const layer = layerRef.current;
    const trailGroup = trailGroupRef.current;
    if (!section || !layer || !trailGroup) return;
    if (prefersReducedMotion()) return;
    if (!window.matchMedia("(pointer: fine)").matches) return; // no fine pointer => touch-only, skip

    let activeCount = 0;
    let nextSpawnAt = 0;
    let points: Point[] = [];
    let rafId: number | null = null;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let trimTimer: ReturnType<typeof setInterval> | null = null;
    let settled = false;
    const liveTimelines = new Set<gsap.core.Timeline>();
    // Every img/div this effect instance has imperatively appended to
    // `layer`, tracked so cleanup can remove exactly those and nothing
    // else. `layer` itself also holds the React-rendered <svg> (the trail)
    // as a child — a blunter cleanup like `layer.replaceChildren()` would
    // rip that out too, which is invisible in production but breaks under
    // React Strict Mode's dev-only double-invoke: the first (throwaway)
    // mount's cleanup would detach the real SVG from the DOM, orphaning
    // trailGroupRef/trailPathRefs for the second (live) mount — the trail
    // keeps computing and setting its `d` attribute correctly from then
    // on, just on an element no longer attached to the page.
    const liveNodes = new Set<HTMLElement>();

    const applyTransform = (el: HTMLElement, x: number, y: number, rot: number, opacity: number) => {
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${rot.toFixed(1)}deg)`;
      el.style.opacity = String(opacity);
    };

    function spawnImageArtifact(src: string, x: number, y: number, sizeRange: [number, number]) {
      if (activeCount >= MAX_ARTIFACTS) return;
      activeCount++;

      const img = document.createElement("img");
      img.src = src;
      img.alt = "";
      img.setAttribute("aria-hidden", "true");
      img.draggable = false;
      const size = rand(sizeRange[0], sizeRange[1]);
      img.style.position = "absolute";
      img.style.left = "0";
      img.style.top = "0";
      img.style.width = `${size}px`;
      img.style.height = "auto";
      img.style.willChange = "transform, opacity";
      layer!.appendChild(img);
      liveNodes.add(img);

      const startX = x + rand(-15, 15) - size / 2;
      const startY = y - size / 2 - 6;
      const fallDistance = rand(40, 90);
      const rotation = rand(-70, 70);
      const proxy = { x: startX, y: startY, rot: 0, opacity: 0 };
      applyTransform(img, proxy.x, proxy.y, proxy.rot, proxy.opacity);

      const tl = gsap.timeline({
        onComplete: () => {
          liveTimelines.delete(tl);
          img.remove();
          liveNodes.delete(img);
          activeCount--;
        },
      });
      liveTimelines.add(tl);
      tl.to(proxy, {
        opacity: 0.95,
        duration: 0.25,
        onUpdate: () => applyTransform(img, proxy.x, proxy.y, proxy.rot, proxy.opacity),
      }).to(proxy, {
        y: startY + fallDistance,
        rot: rotation,
        opacity: 0,
        duration: rand(1.6, 2.4),
        ease: "sine.in",
        onUpdate: () => applyTransform(img, proxy.x, proxy.y, proxy.rot, proxy.opacity),
      });
    }

    function spawnCottonCluster(x: number, y: number) {
      const count = Math.floor(rand(2, 5));
      for (let i = 0; i < count; i++) {
        if (activeCount >= MAX_ARTIFACTS) return;
        activeCount++;

        const el = document.createElement("div");
        const size = rand(14, 34);
        el.style.position = "absolute";
        el.style.left = "0";
        el.style.top = "0";
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.borderRadius = "9999px";
        el.style.background = COTTON_COLOR;
        el.style.filter = `blur(${rand(3, 6).toFixed(1)}px)`;
        el.style.willChange = "transform, opacity";
        layer!.appendChild(el);
        liveNodes.add(el);

        const startX = x + rand(-30, 30) - size / 2;
        const startY = y + rand(-20, 20) - size / 2;
        const drift = rand(30, 65);
        const sway = rand(-18, 18);
        const proxy = { x: startX, y: startY, opacity: 0 };
        const apply = () => {
          el.style.transform = `translate(${proxy.x.toFixed(1)}px, ${proxy.y.toFixed(1)}px)`;
          el.style.opacity = String(proxy.opacity);
        };
        apply();

        const tl = gsap.timeline({
          onComplete: () => {
            liveTimelines.delete(tl);
            el.remove();
            liveNodes.delete(el);
            activeCount--;
          },
        });
        liveTimelines.add(tl);
        tl.to(proxy, { opacity: rand(0.25, 0.4), duration: 0.6, onUpdate: apply }).to(proxy, {
          x: startX + sway,
          y: startY - drift,
          opacity: 0,
          duration: rand(2.4, 3.6),
          ease: "sine.inOut",
          onUpdate: apply,
        });
      }
    }

    function maybeSpawnArtifact(x: number, y: number) {
      const roll = Math.random();
      if (roll < 0.35) spawnImageArtifact(COWRIE_SRC, x, y, COWRIE_SIZE);
      else if (roll < 0.7) spawnImageArtifact(RAFFIA_SRC, x, y, RAFFIA_SIZE);
      else spawnCottonCluster(x, y);
    }

    function updateTrailPaths() {
      const d = buildPathD(points);
      for (const path of trailPathRefs.current) {
        if (path) path.setAttribute("d", d);
      }
    }

    function drawLoop() {
      updateTrailPaths();
      if (points.length > 0) {
        rafId = requestAnimationFrame(drawLoop);
      } else {
        rafId = null;
      }
    }

    function settleTrail() {
      if (points.length === 0 || settled) return;
      settled = true;

      // Curl the tail into a small loosening spiral instead of just
      // fading a straight line, so it reads as "thread settling."
      const last = points[points.length - 1];
      const spiral: Point[] = [];
      const steps = 10;
      let radius = 9;
      for (let i = 1; i <= steps; i++) {
        const angle = (i / steps) * (Math.PI * 2 * 1.6);
        radius *= 0.87;
        spiral.push({ x: last.x + Math.cos(angle) * radius, y: last.y + Math.sin(angle) * radius });
      }
      points = [...points, ...spiral];
      const floorLength = spiral.length + 1;

      trimTimer = setInterval(() => {
        if (points.length > floorLength) {
          points.shift();
        } else if (trimTimer) {
          clearInterval(trimTimer);
          trimTimer = null;
        }
      }, 45);

      gsap.to(trailGroup, {
        opacity: 0,
        duration: 1.3,
        ease: "power1.in",
        onComplete: () => {
          if (trimTimer) {
            clearInterval(trimTimer);
            trimTimer = null;
          }
          points = [];
          settled = false;
          trailGroup!.style.opacity = "1";
          updateTrailPaths();
        },
      });
    }

    function onPointerMove(e: PointerEvent) {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      const rect = section!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const now = performance.now();

      if (settled) {
        gsap.killTweensOf(trailGroup);
        trailGroup!.style.opacity = "1";
        settled = false;
        points = [];
        if (trimTimer) {
          clearInterval(trimTimer);
          trimTimer = null;
        }
      }

      points.push({ x, y });
      if (points.length > TRAIL_MAX_POINTS) points = points.slice(points.length - TRAIL_MAX_POINTS);

      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(settleTrail, IDLE_MS);

      if (rafId === null) rafId = requestAnimationFrame(drawLoop);

      if (now >= nextSpawnAt) {
        nextSpawnAt = now + rand(SPAWN_MIN_MS, SPAWN_MAX_MS);
        maybeSpawnArtifact(x, y);
      }
    }

    section.addEventListener("pointermove", onPointerMove);

    return () => {
      section.removeEventListener("pointermove", onPointerMove);
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (idleTimer) clearTimeout(idleTimer);
      if (trimTimer) clearInterval(trimTimer);
      for (const tl of liveTimelines) tl.kill();
      gsap.killTweensOf(trailGroup);
      for (const node of liveNodes) node.remove();
      liveNodes.clear();
    };
  }, [containerRef]);

  return (
    <div ref={layerRef} aria-hidden className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
      <svg className="absolute inset-0 h-full w-full">
        <g ref={trailGroupRef}>
          {KENTE_COLORS.map((color, i) => (
            <path
              key={color}
              ref={(el) => {
                trailPathRefs.current[i] = el;
              }}
              fill="none"
              stroke={color}
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray="8 24"
              strokeDashoffset={-(i * 8)}
              opacity={0.85}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}

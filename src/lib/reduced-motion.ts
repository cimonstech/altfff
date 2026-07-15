/**
 * Global reduced-motion check. When true: Lenis is not created (native
 * scrolling), and every GSAP reveal must render its final state instantly
 * (components call this and `gsap.set` the end values instead of tweening).
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

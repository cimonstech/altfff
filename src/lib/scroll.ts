import type Lenis from "lenis";

let lenis: Lenis | null = null;

export function setLenis(instance: Lenis | null) {
  lenis = instance;
}

export function getLenis() {
  return lenis;
}

/** Smooth-scroll to a selector via Lenis, falling back to native scroll. */
export function scrollToSection(selector: string) {
  if (lenis) {
    lenis.scrollTo(selector);
    return;
  }
  document.querySelector(selector)?.scrollIntoView({ behavior: "smooth" });
}

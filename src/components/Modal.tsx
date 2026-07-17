"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";

/**
 * Shared modal shell - dimmed backdrop, centered panel, GSAP fade+scale
 * entrance/exit, close via the X button, a backdrop click, or Escape.
 * Extracted from the country textile-detail modal originally built for
 * AfricaMap.tsx; that component now uses this instead of its own bespoke
 * implementation.
 *
 * Stays mounted through its own exit animation (cleared once that tween
 * completes) rather than vanishing the instant `isOpen` goes false - the
 * caller should keep rendering whatever content it wants visible through
 * that fade rather than swapping `children` to something empty.
 *
 * No padding is imposed on the panel - `children` owns its own layout, so
 * content that needs to sit flush against the panel's outer edge (e.g. a
 * full-bleed decorative border strip) isn't fighting a default inset it
 * didn't ask for.
 */
export default function Modal({
  isOpen,
  onClose,
  children,
  titleId,
  panelClassName = "max-w-md",
  restoreFocusRef,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** id of an element inside `children` (typically the heading) for
   * aria-labelledby. */
  titleId?: string;
  /** Overrides the panel's width/sizing classes (default: max-w-md). */
  panelClassName?: string;
  /**
   * Element to return focus to once the close animation finishes. Defaults
   * to whatever had focus when the modal opened (document.activeElement) -
   * pass this explicitly when the trigger isn't a real focusable HTML
   * control at interaction time (e.g. an SVG hit-rect), since relying on
   * document.activeElement alone isn't reliable cross-browser for those.
   */
  restoreFocusRef?: RefObject<(HTMLElement | SVGElement) | null>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const capturedFocusRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      capturedFocusRef.current = document.activeElement as HTMLElement | null;
      setMounted(true);
    }
  }, [isOpen]);

  // Body scroll lock for as long as the modal is mounted (covers the exit
  // animation too, not just `isOpen`) - otherwise the page behind a
  // full-screen mobile panel keeps scrolling under the user's thumb.
  useEffect(() => {
    if (!mounted) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mounted]);

  // Escape closes regardless of where focus currently is - document-level
  // rather than scoped to a wrapper, since this modal can be triggered
  // from anywhere on the page. Tab/Shift+Tab cycles focus within the panel
  // so it can't leak to the (visually hidden, but still in the DOM) page
  // behind the backdrop.
  useEffect(() => {
    if (!mounted) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !modalRef.current) return;
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mounted, onClose]);

  useGSAP(
    () => {
      const modal = modalRef.current;
      const backdrop = backdropRef.current;
      if (!modal || !backdrop) return;
      const reduced = prefersReducedMotion();

      // Plain opacity, not autoAlpha: the modal is conditionally mounted by
      // React (`mounted`) rather than kept in the DOM and hidden via
      // visibility, so there's no visibility toggling to do here - and
      // critically, autoAlpha's "from" state sets visibility: hidden
      // synchronously the instant the tween is created, which would make
      // the immediate closeButtonRef.current?.focus() below silently fail
      // (browsers refuse to focus a hidden element).
      if (isOpen) {
        if (reduced) {
          gsap.set(backdrop, { opacity: 0.4 });
          gsap.set(modal, { opacity: 1, scale: 1 });
        } else {
          gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 0.4, duration: 0.3, ease: "power2.out" });
          gsap.fromTo(
            modal,
            { opacity: 0, scale: 0.94 },
            { opacity: 1, scale: 1, duration: 0.35, ease: "power2.out" },
          );
        }
        closeButtonRef.current?.focus();
      } else if (mounted) {
        const finishClose = () => {
          setMounted(false);
          (restoreFocusRef?.current ?? capturedFocusRef.current)?.focus();
        };
        if (reduced) {
          finishClose();
        } else {
          gsap.to(backdrop, { opacity: 0, duration: 0.25, ease: "power2.in" });
          gsap.to(modal, {
            opacity: 0,
            scale: 0.94,
            duration: 0.25,
            ease: "power2.in",
            onComplete: finishClose,
          });
        }
      }
    },
    { scope: containerRef, dependencies: [isOpen, mounted] },
  );

  if (!mounted) return null;

  return (
    <div ref={containerRef} className="fixed inset-0 z-[100]">
      <div
        ref={backdropRef}
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-ink"
        style={{ opacity: 0 }}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-y-auto md:p-6">
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={(e) => e.stopPropagation()}
          className={`pointer-events-auto relative flex h-full max-h-full w-full flex-col overflow-hidden bg-surface shadow-[0_30px_70px_rgba(23,28,38,0.35)] md:my-auto md:h-auto md:max-h-[85vh] md:rounded-lg ${panelClassName}`}
          style={{ opacity: 0 }}
        >
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-full text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M1 1 L15 15 M15 1 L1 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          {/* Scrolls internally if content exceeds the panel's max-height
              (e.g. a long form on a short viewport) - the close button
              above sits outside this scroll area so it stays put. */}
          <div className="overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}



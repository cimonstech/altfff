"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { gsap } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";
import { getLenis } from "@/lib/scroll";

const ALL_LINKS = [
  { label: "Home", href: "/", page: true },
  { label: "About", href: "/about", page: true },
  { label: "Exhibiting", href: "/exhibiting", page: true },
  { label: "Trade Guide", href: "/trade-show-guide", page: true },
  { label: "Sponsorship", href: "/sponsorship", page: true },
  { label: "Contact", href: "/contact", page: true },
];

// `page: true` entries are real, standalone routes (rendered as next/link
// for client-side navigation). The rest are sections that only exist on
// the homepage - those get a "/#id" href (not bare "#id") specifically so
// they still work correctly when clicked from another page: a bare hash
// only ever touches the current page's URL, so from e.g. /about it just
// silently rewrote the address bar without navigating anywhere. "/#id"
// navigates home first, then the browser (or Lenis, via SmoothScroll's
// `anchors: true`) scrolls to the section on arrival.
const LEFT_LINKS = [
  { label: "Home", href: "/", page: true },
  { label: "About", href: "/about", page: true },
  { label: "Exhibiting", href: "/exhibiting", page: true },
];

const RIGHT_LINKS = [
  { label: "Trade Guide", href: "/trade-show-guide", page: true },
  { label: "Sponsorship", href: "/sponsorship", page: true },
  { label: "Contact", href: "/contact", page: true },
];

const EVENT_LINKS = [
  { label: "Alt.FFF 2026", href: "/altfff2026" },
  { label: "Alt.FFF 2027", href: null },
];

const MEDIA_LINKS = [
  { label: "Blog", href: "/blog" },
  { label: "In the news", href: "/media/in-the-news" },
];

const CHAMFER = 22;
const CORNER = 9;

function isActiveLink(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Bar shape: straight top, bottom-left/right corners chamfered at 45° with
 * the chamfer points themselves rounded (quadratic curves). Used both as a
 * clip-path on the blurred bar and as a stroked SVG for the hairline edge.
 */
function barPath(w: number, h: number, c = CHAMFER, r = CORNER) {
  const k = r * Math.SQRT1_2;
  return [
    `M 0 0`,
    `L ${w} 0`,
    `L ${w} ${h - c - r}`,
    `Q ${w} ${h - c} ${w - k} ${h - c + k}`,
    `L ${w - c + k} ${h - k}`,
    `Q ${w - c} ${h} ${w - c - r} ${h}`,
    `L ${c + r} ${h}`,
    `Q ${c} ${h} ${c - k} ${h - k}`,
    `L ${k} ${h - c + k}`,
    `Q 0 ${h - c} 0 ${h - c - r}`,
    `Z`,
  ].join(" ");
}

export default function Nav() {
  const barRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaMobileOpen, setMediaMobileOpen] = useState(false);
  const eventsButtonRef = useRef<HTMLButtonElement>(null);
  const mediaButtonRef = useRef<HTMLButtonElement>(null);
  const mediaPanelRef = useRef<HTMLDivElement>(null);
  const mediaCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaOpenedByHover = useRef(false);
  const mediaFocusPending = useRef(false);
  const eventsPanelRef = useRef<HTMLDivElement>(null);
  const eventsCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventsOpenedByHover = useRef(false);
  const menuOpenRef = useRef(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const menuCloseRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    menuOpenRef.current = menuOpen;
  }, [menuOpen]);

  // Lock body scroll while the overlay is open, force the nav bar visible
  // (the hide-on-scroll effect below checks menuOpenRef and no-ops while
  // open, but Lenis-driven scroll can still be mid-flight from just before
  // the menu opened - this guarantees the bar isn't caught hidden behind
  // the trigger the user just tapped), and move focus into the overlay.
  useEffect(() => {
    if (!menuOpen) return;
    const bar = barRef.current;
    if (bar) gsap.set(bar, { y: 0 });
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    menuCloseRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = overlayRef.current?.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled])",
      );
      if (!focusable || focusable.length === 0) return;
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

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const closeMenu = () => {
    setMenuOpen(false);
    menuTriggerRef.current?.focus();
  };

  const eventsActive = pathname.startsWith("/altfff2026") || pathname.startsWith("/altfff2027");

  const cancelEventsClose = () => {
    if (eventsCloseTimer.current) {
      clearTimeout(eventsCloseTimer.current);
      eventsCloseTimer.current = null;
    }
  };

  const scheduleEventsClose = () => {
    cancelEventsClose();
    eventsCloseTimer.current = setTimeout(() => setEventsOpen(false), 140);
  };

  useEffect(() => {
    setEventsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!eventsOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (eventsButtonRef.current?.contains(target) || eventsPanelRef.current?.contains(target)) return;
      setEventsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEventsOpen(false);
    };
    const onScroll = () => setEventsOpen(false);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll);
    };
  }, [eventsOpen]);

  const mediaActive = pathname.startsWith("/blog") || pathname.startsWith("/media/in-the-news");

  const cancelMediaClose = () => {
    if (mediaCloseTimer.current) {
      clearTimeout(mediaCloseTimer.current);
      mediaCloseTimer.current = null;
    }
  };

  const scheduleMediaClose = () => {
    cancelMediaClose();
    mediaCloseTimer.current = setTimeout(() => setMediaOpen(false), 140);
  };

  const focusFirstMediaItem = () => {
    mediaPanelRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  };

  const openMediaFromKeyboard = () => {
    mediaFocusPending.current = true;
    setMediaOpen(true);
  };

  useEffect(() => {
    setMediaOpen(false);
    if (mediaActive) setMediaMobileOpen(true);
  }, [pathname, mediaActive]);

  useEffect(() => {
    if (!mediaOpen || !mediaFocusPending.current) return;
    mediaFocusPending.current = false;
    focusFirstMediaItem();
  }, [mediaOpen]);

  useEffect(() => {
    if (!mediaOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (mediaButtonRef.current?.contains(target) || mediaPanelRef.current?.contains(target)) return;
      setMediaOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMediaOpen(false);
      mediaButtonRef.current?.focus();
    };
    const onScroll = () => setMediaOpen(false);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll);
    };
  }, [mediaOpen]);

  // Overlay entrance: panel fades/slides in, links stagger up. Plain
  // opacity, not autoAlpha - the overlay is conditionally mounted (React
  // only renders it while menuOpen), so there's no visibility toggling to
  // do here, and autoAlpha's "from" state sets visibility: hidden for the
  // tween's first tick, which previously made an immediate .focus() call
  // silently fail (see Modal.tsx). Skipped entirely under reduced motion -
  // the overlay just appears at its final state instantly.
  useEffect(() => {
    if (!menuOpen || prefersReducedMotion() || !overlayRef.current) return;
    gsap.fromTo(
      overlayRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.25, ease: "power2.out" },
    );
    gsap.fromTo(
      overlayRef.current.querySelectorAll(".mobile-nav-link"),
      { y: 16, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.4, ease: "power3.out", stagger: 0.05, delay: 0.05 },
    );
  }, [menuOpen]);

  // Measure the bar so the clip-path / border SVG track its real size.
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const measure = () =>
      setDims({ w: bar.offsetWidth, h: bar.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);

  // Hide while actively scrolling (any direction), leaving a 3px lip;
  // slide back ~400ms after scrolling stops. Activity-based, not
  // direction-based, so this is a scroll listener + debounce timer.
  //
  // This listens to Lenis's own "scroll" event, not the native window
  // scroll event: Lenis drives scrolling itself (via rAF-smoothed native
  // scrollTo calls), and the browser coalesces/suppresses most of the
  // native scroll events that would otherwise fire during that animated
  // scroll - in practice as few as one native event for an entire
  // multi-hundred-ms scroll gesture, which starves this debounce logic of
  // the continuous signal it needs to know scrolling is still happening.
  // Lenis's own event fires every animation frame instead (the same event
  // this app already uses to drive ScrollTrigger.update in
  // SmoothScroll.tsx), so it's the reliable source here.
  useEffect(() => {
    const bar = barRef.current;
    if (!bar || prefersReducedMotion()) return;

    const HIDDEN_LIP = 3; // px of the bar left visible when hidden

    let hidden = false;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    let unsubscribe: (() => void) | undefined;
    let waitId: number | undefined;
    let cancelled = false;

    const onScroll = (lenis: { animatedScroll: number }) => {
      if (menuOpenRef.current) return;
      if (lenis.animatedScroll > 80 && !hidden) {
        hidden = true;
        gsap.to(bar, {
          y: -(bar.offsetHeight - HIDDEN_LIP),
          duration: 0.35,
          ease: "power3.out",
          overwrite: "auto",
        });
      }
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        hidden = false;
        gsap.to(bar, { y: 0, duration: 0.55, ease: "power3.out", overwrite: "auto" });
      }, 400);
    };

    // SmoothScroll.tsx creates the Lenis instance in an effect of its own,
    // and effects fire child-first - this component's effect can run
    // before that one has, so the instance isn't guaranteed to exist yet.
    // Poll a frame at a time (bounded by `cancelled` on unmount) until it
    // does; SmoothScroll's effect will always have run by the next frame.
    const waitForLenis = () => {
      if (cancelled) return;
      const lenis = getLenis();
      if (lenis) {
        unsubscribe = lenis.on("scroll", onScroll);
      } else {
        waitId = requestAnimationFrame(waitForLenis);
      }
    };
    waitForLenis();

    return () => {
      cancelled = true;
      if (waitId !== undefined) cancelAnimationFrame(waitId);
      unsubscribe?.();
      clearTimeout(idleTimer);
      gsap.killTweensOf(bar);
    };
  }, []);

  const path = dims ? barPath(dims.w, dims.h) : null;

  const linkClass =
    "relative inline-flex items-center whitespace-nowrap pb-1 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors duration-200 hover:text-gold";

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center">
      <header
        ref={barRef}
        className="pointer-events-auto relative w-full max-w-[1012px]"
        style={{
          backgroundColor: "#FFFFFF",
          clipPath: path ? `path("${path}")` : undefined,
          // The bottom edge doubles as the 3px "lip" left on screen when
          // the bar is hidden (see the scroll effect above) - a plain
          // hairline for now, no color treatment yet.
          borderBottom: "1px solid var(--hairline)",
        }}
      >
        <nav
          aria-label="Main"
          className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-8 pb-4 pt-3 md:px-10"
        >
          <div className="flex items-center gap-6">
            <button
              ref={menuTriggerRef}
              type="button"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-nav-overlay"
              onClick={() => setMenuOpen(true)}
              className="flex h-11 w-11 flex-col items-center justify-center gap-[5px] md:hidden"
            >
              <span className="h-[2px] w-5 bg-ink" />
              <span className="h-[2px] w-5 bg-ink" />
            </button>
            <div className="hidden items-center gap-6 md:flex">
              {LEFT_LINKS.map((l) => {
                const isActive = isActiveLink(l.href, pathname);
                const classes = `${linkClass} ${isActive ? "text-gold underline decoration-gold decoration-2 underline-offset-4" : "text-ink"}`;

                return l.page ? (
                  <Link key={l.label} href={l.href} className={classes}>
                    {l.label}
                  </Link>
                ) : (
                  <a key={l.label} href={l.href} className={classes}>
                    {l.label}
                  </a>
                );
              })}
              <div
                className="relative"
                onMouseEnter={() => {
                  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
                  cancelMediaClose();
                  mediaOpenedByHover.current = true;
                  setMediaOpen(true);
                }}
                onMouseLeave={() => {
                  mediaOpenedByHover.current = false;
                  scheduleMediaClose();
                }}
              >
                <button
                  ref={mediaButtonRef}
                  type="button"
                  aria-expanded={mediaOpen}
                  aria-haspopup="menu"
                  aria-controls="media-menu"
                  onClick={() => {
                    if (mediaOpenedByHover.current) {
                      mediaOpenedByHover.current = false;
                      setMediaOpen(true);
                      return;
                    }
                    setMediaOpen((open) => !open);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      if (mediaOpen) focusFirstMediaItem();
                      else openMediaFromKeyboard();
                    } else if (event.key === "Escape") {
                      setMediaOpen(false);
                    } else if (event.key === "Tab" && mediaOpen && !event.shiftKey) {
                      event.preventDefault();
                      focusFirstMediaItem();
                    }
                  }}
                  className={`${linkClass} ${mediaOpen || mediaActive ? "text-gold" : "text-ink"} ${mediaActive ? "underline decoration-gold decoration-2 underline-offset-4" : ""}`}
                >
                  Media
                  <span
                    aria-hidden
                    className={`ml-1 inline-block h-1.5 w-1.5 translate-y-[-1px] border-b border-r border-current transition-transform ${mediaOpen ? "-rotate-45" : "rotate-45"}`}
                  />
                </button>
              </div>
            </div>
          </div>

          <Link href="/" className="flex items-center justify-center" aria-label="Alt.FFF home">
            <Image
              src="/alt-fff-logo.png"
              alt="Alt.FFF logo"
              width={927}
              height={565}
              className="h-10 w-auto md:h-12"
              priority
            />
          </Link>

          <div className="hidden items-center justify-end gap-5 md:flex">
            <div
              className="relative"
              onMouseEnter={() => {
                cancelEventsClose();
                eventsOpenedByHover.current = true;
                setEventsOpen(true);
              }}
              onMouseLeave={() => {
                eventsOpenedByHover.current = false;
                scheduleEventsClose();
              }}
            >
              <button
                ref={eventsButtonRef}
                type="button"
                aria-expanded={eventsOpen}
                aria-haspopup="true"
                aria-controls="events-menu"
                onClick={() => {
                  if (eventsOpenedByHover.current) {
                    setEventsOpen(true);
                    return;
                  }
                  setEventsOpen((open) => !open);
                }}
                className={`${linkClass} ${eventsOpen || eventsActive ? "text-gold" : "text-ink"} ${eventsActive ? "underline decoration-gold decoration-2 underline-offset-4" : ""}`}
              >
                Events
                <span
                  aria-hidden
                  className={`ml-1 inline-block h-1.5 w-1.5 translate-y-[-1px] border-b border-r border-current transition-transform ${eventsOpen ? "-rotate-45" : "rotate-45"}`}
                />
              </button>
            </div>
            {RIGHT_LINKS.map((l) => {
              const isActive = isActiveLink(l.href, pathname);
              const classes = `${linkClass} ${isActive ? "text-gold underline decoration-gold decoration-2 underline-offset-4" : "text-ink"}`;

              return l.page ? (
                <Link key={l.label} href={l.href} className={classes}>
                  {l.label}
                </Link>
              ) : (
                <a key={l.label} href={l.href} className={classes}>
                  {l.label}
                </a>
              );
            })}
          </div>
        </nav>

        {dims && (
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0"
            width={dims.w}
            height={dims.h}
            viewBox={`0 0 ${dims.w} ${dims.h}`}
            fill="none"
          >
            <path d={barPath(dims.w, dims.h)} stroke="var(--hairline)" strokeWidth="1.5" />
          </svg>
        )}
      </header>

      {menuOpen && (
        <div
          ref={overlayRef}
          id="mobile-nav-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          className="pointer-events-auto fixed inset-0 z-[60] flex flex-col bg-ink px-8 pb-10 pt-6 md:hidden"
        >
          <div className="flex items-center justify-between">
            <Link href="/" onClick={closeMenu} className="flex items-center" aria-label="Alt.FFF home">
              <Image
                src="/alt-fff-logo-white.png"
                alt="Alt.FFF logo"
                width={715}
                height={565}
                className="h-10 w-auto"
              />
            </Link>
            <button
              ref={menuCloseRef}
              type="button"
              aria-label="Close menu"
              onClick={closeMenu}
              className="flex h-11 w-11 items-center justify-center"
            >
              <span className="relative block h-5 w-5">
                <span className="absolute left-0 top-1/2 h-[2px] w-5 -translate-y-1/2 rotate-45 bg-paper" />
                <span className="absolute left-0 top-1/2 h-[2px] w-5 -translate-y-1/2 -rotate-45 bg-paper" />
              </span>
            </button>
          </div>

          <nav aria-label="Mobile" className="mt-6 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain py-2">
            {ALL_LINKS.map((l) => {
              const isActive = isActiveLink(l.href, pathname);
              const classes = `mobile-nav-link min-h-[44px] py-2 font-display text-3xl font-extrabold uppercase leading-tight transition-colors duration-200 hover:text-gold ${isActive ? "text-gold" : "text-paper"}`;

              return (
                <span key={l.label} className="contents">
                  {l.label === "Trade Guide" && (
                    <div className="mobile-nav-link py-2">
                      <button
                        type="button"
                        aria-expanded={mediaMobileOpen}
                        aria-haspopup="true"
                        aria-controls="mobile-media-menu"
                        onClick={() => setMediaMobileOpen((open) => !open)}
                        className={`flex min-h-[44px] w-full items-center gap-3 py-2 text-left font-display text-3xl font-extrabold uppercase leading-tight transition-colors duration-200 hover:text-gold ${mediaActive ? "text-gold" : "text-paper"}`}
                      >
                        Media
                        <span
                          aria-hidden
                          className={`inline-block h-2 w-2 border-b-2 border-r-2 border-current transition-transform ${mediaMobileOpen ? "-rotate-45" : "rotate-45"}`}
                        />
                      </button>
                      {mediaMobileOpen && (
                        <div id="mobile-media-menu" className="mt-1 flex flex-col gap-1 pl-4">
                          {MEDIA_LINKS.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={closeMenu}
                              className={`min-h-11 py-1 font-display text-xl font-extrabold uppercase leading-tight hover:text-gold ${pathname.startsWith(item.href) ? "text-gold" : "text-paper/80"}`}
                            >
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {l.label === "Trade Guide" && (
                    <div className="mobile-nav-link py-2">
                      <p className="font-display text-3xl font-extrabold uppercase leading-tight text-paper">Events</p>
                      <div className="mt-2 flex flex-col gap-1 pl-1">
                        {EVENT_LINKS.map((event) =>
                          event.href ? (
                            <Link
                              key={event.label}
                              href={event.href}
                              onClick={closeMenu}
                              className={`min-h-11 py-1 font-display text-xl font-extrabold uppercase leading-tight hover:text-gold ${pathname.startsWith(event.href) ? "text-gold" : "text-paper/80"}`}
                            >
                              {event.label}
                            </Link>
                          ) : (
                            <p key={event.label} className="min-h-11 py-1 font-display text-xl font-extrabold uppercase leading-tight text-paper/45">
                              {event.label}
                              <span className="mt-0.5 block font-sans text-[11px] font-medium normal-case tracking-[0.16em]">
                                Coming soon
                              </span>
                            </p>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                  <Link href={l.href} onClick={closeMenu} className={classes}>
                    {l.label}
                  </Link>
                </span>
              );
            })}
          </nav>

          <Link
            href="/exhibiting"
            onClick={closeMenu}
            className="mobile-nav-link mt-6 inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-paper transition-opacity hover:opacity-85"
          >
            Exhibit With Us
          </Link>
        </div>
      )}

      {eventsOpen &&
        createPortal(
          <div
            ref={eventsPanelRef}
            id="events-menu"
            role="menu"
            aria-label="Events"
            className="fixed z-[70] hidden min-w-[210px] rounded-2xl border border-ink/10 bg-white p-2 shadow-[0_18px_40px_rgba(1,83,71,0.14)] md:block"
            style={{
              top: (eventsButtonRef.current?.getBoundingClientRect().bottom ?? 72) + 10,
              left: eventsButtonRef.current?.getBoundingClientRect().left ?? 0,
            }}
            onMouseEnter={cancelEventsClose}
            onMouseLeave={scheduleEventsClose}
          >
            {EVENT_LINKS.map((event) =>
              event.href ? (
                <Link
                  key={event.label}
                  href={event.href}
                  role="menuitem"
                  onClick={() => setEventsOpen(false)}
                  className={`block rounded-xl px-3 py-2.5 text-[12px] font-medium uppercase tracking-[0.14em] hover:bg-paper hover:text-gold ${pathname.startsWith(event.href) ? "text-gold" : "text-ink"}`}
                >
                  {event.label}
                </Link>
              ) : (
                <p
                  key={event.label}
                  role="menuitem"
                  aria-disabled="true"
                  className="rounded-xl px-3 py-2.5 text-[12px] font-medium uppercase tracking-[0.14em] text-ink/40"
                >
                  {event.label}
                  <span className="mt-0.5 block text-[10px] normal-case tracking-[0.16em] text-ink/45">Coming soon</span>
                </p>
              ),
            )}
          </div>,
          document.body,
        )}

      {mediaOpen &&
        createPortal(
          <div
            ref={mediaPanelRef}
            id="media-menu"
            role="menu"
            aria-label="Media"
            className="fixed z-[70] hidden min-w-[210px] rounded-2xl border border-ink/10 bg-white p-2 shadow-[0_18px_40px_rgba(1,83,71,0.14)] md:block"
            style={{
              top: (mediaButtonRef.current?.getBoundingClientRect().bottom ?? 72) + 10,
              left: mediaButtonRef.current?.getBoundingClientRect().left ?? 0,
            }}
            onMouseEnter={cancelMediaClose}
            onMouseLeave={scheduleMediaClose}
          >
            {MEDIA_LINKS.map((item, index) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  onClick={() => setMediaOpen(false)}
                  onKeyDown={(event) => {
                    const items = mediaPanelRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setMediaOpen(false);
                      mediaButtonRef.current?.focus();
                    } else if (event.key === "ArrowDown" && items) {
                      event.preventDefault();
                      items[(index + 1) % items.length]?.focus();
                    } else if (event.key === "ArrowUp" && items) {
                      event.preventDefault();
                      items[(index - 1 + items.length) % items.length]?.focus();
                    } else if (event.key === "Tab" && event.shiftKey && index === 0) {
                      event.preventDefault();
                      setMediaOpen(false);
                      mediaButtonRef.current?.focus();
                    } else if (event.key === "Tab" && !event.shiftKey && index === MEDIA_LINKS.length - 1) {
                      event.preventDefault();
                      setMediaOpen(false);
                      const header = mediaButtonRef.current?.closest("header");
                      const focusable = header
                        ? Array.from(header.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"))
                        : [];
                      const buttonIndex = mediaButtonRef.current ? focusable.indexOf(mediaButtonRef.current) : -1;
                      focusable[buttonIndex + 1]?.focus();
                    }
                  }}
                  className={`block rounded-xl px-3 py-2.5 text-[12px] font-medium uppercase tracking-[0.14em] hover:bg-paper hover:text-gold ${active ? "text-gold" : "text-ink"}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}



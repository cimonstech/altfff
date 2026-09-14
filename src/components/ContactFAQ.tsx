"use client";

import { useEffect, useId, useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { textWithBrandName } from "@/components/BrandName";
import { EVENT } from "@/lib/constants";
import { prefersReducedMotion } from "@/lib/reduced-motion";

type FAQItem = { question: string; answer: string };

// Answers are written from what's already established elsewhere on this
// site (dates/venue, materials, exhibitor packages, partners) - the old
// altfff.com page's own answer copy wasn't available to reuse.
const FAQ_ITEMS: FAQItem[] = [
  {
    question: "What types of materials and innovations will be showcased at Alt.FFF 2026?",
    answer:
      "Alt.FFF showcases African-sourced materials across fibres, dyes and finished textiles - including kente, natural dyes, raffia, leather, cotton and cowrie & shells - alongside the manufacturers and innovators working with them. Expect both raw material sourcing and finished-product innovation in one space.",
  },
  {
    question: "What are the dates and location for the Alternative Fashion Fabric Fair (Alt.FFF) 2026?",
    answer:
      `Alt.FFF 2026 is a one-day trade fair on ${EVENT.tradeFairDateLabel} (exhibitor set-up ${EVENT.setupDateLabel}) at ${EVENT.venue}. ${EVENT.launchCeremonyLabel}. ${EVENT.doorsOpenLabel}.`,
  },
  {
    question: "Who is the founder of the Alternative Fashion Fabric Fair?",
    answer:
      "Alt.FFF was founded by Makeba Nana Boateng, APR, USPAP-ISA, a celebrated cultural strategist and appraiser with more than three decades of experience championing African fashion and textile heritage.",
  },
  {
    question: "How can I register as an exhibitor for Alt.FFF 2026?",
    answer:
      "Exhibitor registration happens through the Exhibiting page, where you can review the package tiers - Standard, Medium and Premium booths, plus the Innovation Start-up Pod - and apply directly via the online form.",
  },
  {
    question: "How can I participate in exhibitions that focus on sustainable fashion materials in Africa?",
    answer:
      "Alt.FFF exists specifically for this - apply to exhibit via the Exhibiting page if you produce or work with raw or semi-processed materials across Africa. Retail-only businesses aren't eligible to exhibit but can still advertise in the Trade Show Guide.",
  },
  {
    question:
      "Where can I find information about upcoming fashion trade fairs in Africa focusing on sustainable materials?",
    answer:
      "Alt.FFF itself is Ghana's alternative fashion fabric fair - this site and Fashion Forum Africa's own channels are the best source for updates on this and future editions.",
  },
  {
    question: "Which organisations are supporting the Alternative Fashion Fabric Fair?",
    answer:
      "Alt.FFF is backed by a mix of partners, sponsors and collaborators, including Fashion Forum Africa, MCPR Africa and Black Star Experience as partners, DIMO as a sponsor, alongside collaborators such as the Association of Ghana Industries, the National Commission on Culture, the Institute of Textiles & Fashion Professionals Ghana, and Ghana Culture Forum.",
  },
  {
    question: "Are there any platforms that promote collaborations between African artisans and global fashion brands?",
    answer:
      "Alt.FFF is built for exactly this kind of connection, bringing manufacturers, artisans and material producers face to face with international buyers, designers and brands in one concentrated trade-fair day.",
  },
  {
    question:
      "How can textile producers in Africa connect with designers and buyers interested in alternative materials?",
    answer:
      "The most direct route is exhibiting at Alt.FFF, where producers get a booth in one space in front of buyers actively sourcing alternative materials - apply via the Exhibiting page.",
  },
  {
    question: "What are some events in 2026 that highlight African heritage textiles and innovations?",
    answer:
      `Alt.FFF, ${EVENT.tradeFairDateLabel} in Accra, is designed as exactly this kind of event - a dedicated showcase of African heritage textiles, materials and the innovators reworking them for a global market.`,
  },
];

/** Rotating "+" / "−" indicator - a horizontal bar that's always there,
 * plus a vertical bar that rotates 90° via GSAP to lie flat on top of it
 * when open, turning "+" into "−". */
function Indicator({ open }: { open: boolean }) {
  const vBarRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) {
      gsap.set(vBarRef.current, { rotate: open ? 90 : 0 });
      return;
    }
    gsap.to(vBarRef.current, { rotate: open ? 90 : 0, duration: 0.3, ease: "power2.out" });
  }, [open]);

  return (
    <span className="relative h-4 w-4 shrink-0" aria-hidden="true">
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="h-[1.5px] w-4 bg-ink" />
      </span>
      <span ref={vBarRef} className="absolute inset-0 flex items-center justify-center">
        <span className="h-4 w-[1.5px] bg-ink" />
      </span>
    </span>
  );
}

function AccordionItem({ item, open, onToggle }: { item: FAQItem; open: boolean; onToggle: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const buttonId = useId();
  const panelId = useId();

  useEffect(() => {
    const panel = panelRef.current;
    const content = contentRef.current;
    if (!panel || !content) return;

    if (prefersReducedMotion()) {
      gsap.set(panel, { height: open ? "auto" : 0 });
      return;
    }

    // Animate to a real pixel height (GSAP can't tween to "auto" directly),
    // then swap to "auto" once open so it still reflows correctly if the
    // content or viewport width changes later.
    gsap.killTweensOf(panel);
    if (open) {
      const target = content.scrollHeight;
      gsap.fromTo(
        panel,
        { height: 0 },
        { height: target, duration: 0.35, ease: "power2.inOut", onComplete: () => gsap.set(panel, { height: "auto" }) },
      );
    } else {
      gsap.set(panel, { height: panel.scrollHeight });
      gsap.to(panel, { height: 0, duration: 0.3, ease: "power2.inOut" });
    }
  }, [open]);

  return (
    <div className="border-b border-hairline">
      <h3>
        <button
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-4 py-5 text-left"
        >
          <span className="font-display text-sm font-bold uppercase tracking-tight text-ink md:text-base">
            {textWithBrandName(item.question)}
          </span>
          <Indicator open={open} />
        </button>
      </h3>
      <div
        ref={panelRef}
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className="overflow-hidden"
        style={{ height: 0 }}
      >
        <div ref={contentRef} className="pb-5 text-sm leading-relaxed text-indigo md:text-base">
          {textWithBrandName(item.answer)}
        </div>
      </div>
    </div>
  );
}

/** One open at a time, scoped per column - the two columns are
 * independent accordion groups, not one shared state. */
function AccordionColumn({ items }: { items: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <div>
      {items.map((item, i) => (
        <AccordionItem
          key={item.question}
          item={item}
          open={openIndex === i}
          onToggle={() => setOpenIndex((cur) => (cur === i ? null : i))}
        />
      ))}
    </div>
  );
}

export default function ContactFAQ() {
  const container = useRef<HTMLElement>(null);
  const half = Math.ceil(FAQ_ITEMS.length / 2);
  const columnOne = FAQ_ITEMS.slice(0, half);
  const columnTwo = FAQ_ITEMS.slice(half);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(".faq-in", {
        y: 24,
        autoAlpha: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.1,
        scrollTrigger: { trigger: container.current, start: "top 75%", once: true },
      });
    },
    { scope: container },
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <section ref={container} aria-label="Frequently asked questions" className="bg-surface px-6 py-20 md:px-16 md:py-28">
      <div className="mx-auto max-w-6xl">
        <h2 className="faq-in mb-12 font-display text-[clamp(2rem,5vw,3.5rem)] font-extrabold uppercase tracking-tight text-ink">
          Frequently Asked Questions
        </h2>
        <div className="faq-in grid gap-x-12 md:grid-cols-2">
          <AccordionColumn items={columnOne} />
          <AccordionColumn items={columnTwo} />
        </div>
      </div>

      {/* No JSON-LD helper exists elsewhere in this repo, so this is
          inlined directly, generated from the same FAQ_ITEMS array the
          visible accordion renders. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </section>
  );
}



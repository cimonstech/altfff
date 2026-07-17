"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";

type Block = {
  heading: string;
  paragraphs: string[];
  image: { src: string; alt: string };
  cta?: { label: string; href: string };
};

const BLOCKS: Block[] = [
  {
    heading: "The Alternative Fashion Fabric Fair",
    paragraphs: [
      "Is a premier platform uniting businesses across Africa's fashion and textile value chain. The Fair promotes meaningful connections, collaborations, and opportunities in sales, sourcing, and supply.",
      "Participants span the entire industry, from small and large-scale manufacturers to ethical producers, textile makers, artisans, fibre and fabric innovators, and export facilitators.",
    ],
    image: {
      src: "/materials/Finished-Materials/Mohair-finished-2.jpg",
      alt: "Finished mohair textile",
    },
  },
  {
    heading: "Exhibitor Criteria & Call for Participation",
    paragraphs: [
      "Exhibitors must be businesses manufacturing in Africa, whether engaged in textiles, leather, fabrics (for fashion or home), accessories, or raw material processing within the fashion ecosystem.",
      "We are welcoming applications through an open call. Final selection and curation will be carefully managed to ensure a diverse, high-quality, and comprehensive showcase of Africa's textile and fashion supply chain.",
    ],
    image: {
      src: "/materials/Finished-Materials/sisal-garments.jpeg",
      alt: "Finished garments made from sisal",
    },
  },
  {
    heading: "Sourcing Opportunities at the Fair",
    paragraphs: [
      "The Fair will also welcome businesses seeking to source from Africa, whether it's cotton, tanned (but uncut) hides or skins, handwoven cloth, batik, indigo, or kente.",
      "We also invite manufacturers working with locally sourced or recycled materials such as raw silk cocoons or reeled silks, coconut shells, or textiles for accessories.",
      "These examples highlight the kinds of sourcing partnerships and value-chain opportunities available.",
    ],
    image: {
      src: "/materials/Raw-Materials/leather_hides.jpg",
      alt: "Tanned leather hides",
    },
  },
  {
    heading: "Connecting African Producers to Global Markets",
    paragraphs: [
      "Our central focus is to create meaningful opportunities for African producers to connect with buyers, partners, and global markets.",
      "Complete the form below, and a member of the Alt.FFF team will be in touch.",
    ],
    image: {
      src: "/materials/Finished-Materials/pineapple-bag.jpg",
      alt: "Finished bag made from pineapple leather",
    },
    cta: { label: "Get in touch", href: "/contact" },
  },
];

export default function AboutBlocks() {
  const container = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(".content-block", {
        y: 32,
        autoAlpha: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.1,
        scrollTrigger: {
          trigger: container.current,
          start: "top 72%",
          once: true,
        },
      });
    },
    { scope: container },
  );

  return (
    <section
      ref={container}
      id="about-content"
      aria-label="About the fair"
      className="bg-paper px-6 pb-24 md:px-16 md:pb-32"
    >
      <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2">
        {BLOCKS.map((b) => (
          <div
            key={b.heading}
            className="content-block overflow-hidden rounded-xl border border-hairline bg-surface"
          >
            {/* Image top, ink bottom-scrim + white heading - same recipe as
                the Materials grid cards, reused here for visual consistency. */}
            <div className="relative aspect-[16/9] overflow-hidden">
              <Image
                src={b.image.src}
                alt={b.image.alt}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-[70%]"
                style={{
                  background:
                    "linear-gradient(to top, color-mix(in srgb, var(--ink) 88%, transparent), transparent)",
                }}
              />
              <span
                aria-hidden
                className="absolute left-6 top-6 inline-block h-2.5 w-2.5 rotate-45 bg-gold"
              />
              <h2 className="absolute inset-x-0 bottom-0 p-6 font-display text-xl font-extrabold uppercase leading-tight tracking-tight text-paper md:text-2xl">
                {b.heading}
              </h2>
            </div>

            <div className="p-8 md:p-10">
              <div className="flex flex-col gap-3 text-sm leading-relaxed text-indigo md:text-base">
                {b.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              {b.cta && (
                <Link
                  href={b.cta.href}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink transition-opacity hover:opacity-85"
                >
                  {b.cta.label}
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}



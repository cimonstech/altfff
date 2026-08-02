"use client";

import { useRef, type ReactNode } from "react";
import { Landmark, CalendarClock, FileSignature } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/reduced-motion";

const PAYMENTS = [
  <>
    All payments must be made via <strong>bank transfer</strong>.
  </>,
  <>
    <strong>All bank charges and transfer fees</strong> must be covered by
    the payer.
  </>,
  "Alternative Fashion Fabric Fair - Alt. FFF (Project Title).",
  "Proof of transfer must be provided immediately upon payment.",
  <>
    If payment is made in another currency, the payer must ensure the{" "}
    <strong>full invoiced amount</strong> is received without shortfalls.
  </>,
  <>
    <strong>Any withholding tax</strong> applied by the payer is their
    obligation and must <strong>not</strong> reduce the invoice amount due to
    Fashion Forum Africa.
  </>,
];

const CANCELLATIONS = [
  <>
    All deposits are <strong>non-refundable</strong>.
  </>,
  <>
    Cancellations after full payment, received{" "}
    <strong>after February 28, 2026</strong> are non-refundable.
  </>,
  <>
    Participation may be <strong>transferred to another party</strong> with
    prior written approval from Fashion Forum Africa.
  </>,
  <>
    <strong>Daily Late Payment Fee Clause (No Grace Period)</strong>
  </>,
  <>
    Any balance not received by the due date will incur a{" "}
    <strong>late payment fee of 0.15% per calendar day</strong> of the
    outstanding amount, starting immediately after the due date.
  </>,
  <>
    The late fee will continue to accrue until full payment is received.
    Total late fees may not exceed{" "}
    <strong>10% of the outstanding balance</strong>.
  </>,
];

const AGREEMENT_PARAGRAPHS = [
  <>
    By paying the deposit, participants confirm acceptance of these terms. A
    formal acknowledgement will follow by email outlining all obligations and
    deliverables. It is a term of this agreement that the organisers reserve
    the right to amend the configuration of stands and presentation at the
    fair. All exhibitors will be advised of this prior to the commencement of
    the fair.
  </>,
  <>
    All exhibitors will be required to set up on{" "}
    <strong>Friday 18 September 2026</strong>, the day immediately before the
    public fair on <strong>Saturday 19 September 2026</strong>. The fee paid
    for participation includes the construction of a stand, the provision of{" "}
    <strong>one (1) table and two (2) chairs</strong> per
    stand, and the provision of an electrical point. Exhibitors can also
    bring their own equipment which will be verified by the tech team. It is
    possible for exhibitors to obtain extra facilities upon request, but
    these extras are at an additional cost and subject to the
    exhibitor&apos;s own request. Requests for additional services must be
    made by <strong>August 18, 2026</strong>.
  </>,
  <>
    As part of the fee for exhibiting, <strong>Fashion Forum Africa</strong>{" "}
    will undertake a virtual masterclass available to all exhibitors at
    least two weeks before the event. That masterclass is free to all
    exhibitors and will seek to sensitise exhibitors on how to maximize
    their presence at the exhibition. Fashion Forum Africa will request all
    exhibitors to supply publicity material in relation to their products
    and will have the right to advertise each exhibitor&apos;s participation
    in Fashion Forum Africa marketing and advertising for this event. Each
    exhibitor will have free inclusion in the show directory and be included
    in the Fashion Forum Africa database for ongoing marketing.
  </>,
];

function ClauseList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-4 text-sm leading-relaxed text-ink">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink/30" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function TermsCard({
  icon: Icon,
  accent,
  heading,
  className = "",
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>;
  accent: string;
  heading: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`terms-card-in relative overflow-hidden rounded-xl border border-hairline bg-surface p-6 md:p-8 ${className}`}
    >
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1.5 ${accent}`} />
      <div className="flex items-center gap-3">
        <Icon size={20} className="shrink-0 text-ink/70" aria-hidden />
        <h2 className="font-display text-lg font-extrabold uppercase tracking-tight text-ink">
          {heading}
        </h2>
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}

export default function TermsSections() {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const cards = gsap.utils.toArray<HTMLElement>(".terms-card-in", container.current ?? undefined);
      cards.forEach((card) => {
        gsap.from(card, {
          y: 24,
          autoAlpha: 0,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: { trigger: card, start: "top 85%", once: true },
        });
      });
    },
    { scope: container },
  );

  return (
    <section aria-label="Terms details" className="bg-paper px-6 py-16 md:px-16 md:py-20">
      <div ref={container} className="mx-auto max-w-5xl">
        <p className="mx-auto mb-10 max-w-3xl rounded-lg border border-hairline bg-surface px-5 py-4 text-sm leading-relaxed text-ink/80">
          This page summarises the exhibitor terms and conditions from the
          official Alt.FFF Exhibitors Pack. For the complete terms,{" "}
          <a
            href="/Exhibitors+Pack+ALT.FFF_June+2026.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-gold-deep hover:opacity-75"
          >
            download the full pack
          </a>
          .
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <TermsCard icon={Landmark} accent="bg-forest" heading="Payments">
            <ClauseList items={PAYMENTS} />
          </TermsCard>
          <TermsCard icon={CalendarClock} accent="bg-gold" heading="Cancellations & Refunds">
            <ClauseList items={CANCELLATIONS} />
          </TermsCard>
        </div>

        <TermsCard icon={FileSignature} accent="bg-forest" heading="Agreement" className="mt-6">
          <div className="flex flex-col gap-5 text-sm leading-relaxed text-ink">
            {AGREEMENT_PARAGRAPHS.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </TermsCard>
      </div>
    </section>
  );
}

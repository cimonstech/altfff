import type { Metadata } from "next";
import WalkInRegisterForm from "@/components/WalkInRegisterForm";
import { buildMetadata } from "@/lib/metadata";
import { EVENT } from "@/lib/constants";
import {
  isWalkInRegistrationEnabled,
  WALK_IN_REGISTRATION_CLOSED_MESSAGE,
} from "@/lib/appSettings";

export const metadata: Metadata = {
  ...buildMetadata({
    title: "Register Your Visit - Alt.FFF",
    description: `Register your visit to ${EVENT.name}, ${EVENT.dates}. Quick sign-up at the venue on your phone.`,
    path: "/walk-in",
  }),
  robots: { index: false, follow: false },
};

export default async function WalkInPage() {
  const enabled = await isWalkInRegistrationEnabled();

  return (
    <main className="min-h-dvh bg-paper px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-8 text-center">
          <p className="font-display text-xs font-bold uppercase tracking-[0.25em] text-gold-deep">Alt.FFF</p>
          <h1 className="mt-2 font-display text-[clamp(1.5rem,5vw,2rem)] font-extrabold uppercase tracking-tight text-ink">
            Register your visit
          </h1>
          {enabled ? (
            <>
              <p className="mt-3 text-sm leading-relaxed text-ink/70">
                Welcome to Alt.FFF. Fill in your details below and you&apos;re registered. We&apos;ll text a
                confirmation to your phone (or email if your number isn&apos;t Ghanaian). No QR code needed.
              </p>
              <p className="mt-2 text-xs text-ink/45">
                {EVENT.launchCeremonyLabel} · {EVENT.doorsOpenLabel}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-ink/70">{WALK_IN_REGISTRATION_CLOSED_MESSAGE}</p>
          )}
        </header>

        {enabled ? (
          <WalkInRegisterForm />
        ) : (
          <div className="rounded-xl border border-hairline bg-surface px-5 py-6 text-center">
            <p className="text-sm leading-relaxed text-ink/70">{WALK_IN_REGISTRATION_CLOSED_MESSAGE}</p>
            <p className="mt-3 text-xs text-ink/45">{EVENT.tradeFairDateLabel} · {EVENT.venue}</p>
          </div>
        )}
      </div>
    </main>
  );
}

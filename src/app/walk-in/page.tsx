import type { Metadata } from "next";
import WalkInRegisterForm from "@/components/WalkInRegisterForm";
import { buildMetadata } from "@/lib/metadata";
import { EVENT } from "@/lib/constants";

export const metadata: Metadata = {
  ...buildMetadata({
    title: "Walk-in Registration — Alt.FFF",
    description: `On-site visitor registration for ${EVENT.name}, ${EVENT.dates}.`,
    path: "/walk-in",
  }),
  robots: { index: false, follow: false },
};

export default function WalkInPage() {
  return (
    <main className="min-h-dvh bg-paper px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-8 text-center">
          <p className="font-display text-xs font-bold uppercase tracking-[0.25em] text-gold-deep">Alt.FFF</p>
          <h1 className="mt-2 font-display text-[clamp(1.5rem,5vw,2rem)] font-extrabold uppercase tracking-tight text-ink">
            Walk-in registration
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink/70">
            Quick sign-in at the door. You&apos;ll get a welcome email and text — no QR code needed.
          </p>
        </header>

        <WalkInRegisterForm />
      </div>
    </main>
  );
}

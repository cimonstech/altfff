const SLOTS = ["Partner 1", "Partner 2", "Partner 3", "Partner 4", "Partner 5"];

export default function Partners() {
  return (
    <section
      id="sponsorship"
      aria-label="Partners"
      className="border-t border-hairline bg-paper px-6 py-16 md:px-16"
    >
      <p className="mb-10 text-center text-[11px] uppercase tracking-[0.24em] text-indigo">
        Partners &amp; Sponsors
      </p>
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-14 gap-y-8">
        {SLOTS.map((name) => (
          <span
            key={name}
            className="font-display text-lg font-semibold uppercase text-ink opacity-40"
          >
            {name}
          </span>
        ))}
      </div>
    </section>
  );
}

import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6 py-20 text-ink">
      <div className="max-w-xl text-center">
        <Image
          src="/alt-fff-logo.png"
          alt="Alt.FFF"
          width={160}
          height={48}
          className="mx-auto h-10 w-auto object-contain"
          priority
        />
        <p className="mb-4 mt-8 font-display text-sm font-semibold uppercase tracking-[0.3em] text-gold">
          404
        </p>
        <h1 className="font-display text-4xl font-extrabold uppercase tracking-tight sm:text-5xl">
          Page not found
        </h1>
        <p className="mt-4 text-base leading-7 text-ink/80">
          The page you are looking for does not exist or may have moved.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-ink transition-opacity hover:opacity-85"
        >
          Return home
        </Link>
      </div>
    </main>
  );
}

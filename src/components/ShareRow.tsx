"use client";

import { useState } from "react";
import { Copy, Check, Share2 } from "lucide-react";
import { SITE } from "@/lib/constants";

export default function ShareRow({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${SITE.url}/news/${slug}`;
  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (permissions/older browser) - no-op,
      // the button just won't confirm. Not worth a visible error state
      // for a non-critical share affordance.
    }
  };

  return (
    <div className="mt-10 flex items-center gap-5 border-t border-hairline pt-6">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink/50">Share</span>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold-deep hover:opacity-75"
      >
        {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
        {copied ? "Copied" : "Copy link"}
      </button>
      <a
        href={linkedInShareUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold-deep hover:opacity-75"
      >
        <Share2 size={14} aria-hidden="true" />
        LinkedIn
      </a>
    </div>
  );
}



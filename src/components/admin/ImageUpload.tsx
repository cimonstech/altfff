"use client";

import { useRef, useState } from "react";
import { uploadImage } from "@/lib/uploadImage";

/**
 * Reusable image upload: file picker -> presigned R2 URL -> direct browser
 * PUT to R2 -> reports the resulting public URL back via onChange. The
 * file's raw bytes never pass through the Next.js server.
 *
 * Client-side type/size checks here are for fast feedback only - the
 * server route (app/api/admin/upload-url) enforces the same rules
 * independently and is what actually matters.
 */
export default function ImageUpload({
  value,
  onChange,
  label = "Image",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file: File) => {
    setError("");
    setUploading(true);
    try {
      const publicUrl = await uploadImage(file);
      onChange(publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so selecting the same file again still fires onChange.
    e.target.value = "";
    if (file) handleFile(file);
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleInputChange} className="hidden" />

      {value ? (
        <div>
          {/* Plain <img>, not next/image - this preview can briefly show a
              non-R2 legacy URL (old test data) or is about to be replaced
              entirely, not worth the remotePatterns friction here. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-40 w-full rounded-md border border-hairline object-cover" />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex min-h-11 items-center px-1 text-sm font-semibold text-gold-deep hover:opacity-75 disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Replace"}
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={uploading}
              className="inline-flex min-h-11 items-center px-1 text-sm font-semibold text-madder hover:opacity-75 disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-40 w-full items-center justify-center rounded-md border border-dashed border-hairline text-sm font-medium text-ink/60 hover:border-gold hover:text-ink disabled:opacity-50"
        >
          {uploading ? "Uploading…" : `Upload ${label}`}
        </button>
      )}

      {error && (
        <p className="mt-2 text-sm text-madder" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Allowed image MIME types for admin R2 uploads (magic-byte verified). */
export const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/**
 * Verify file magic bytes match an allowed image type.
 * Does not trust Content-Type — rejects renamed/spoofed files.
 */
export async function verifyImageMagicBytes(buffer: Uint8Array): Promise<{ ok: true; mime: string } | { ok: false; error: string }> {
  if (buffer.length < 12) {
    return { ok: false, error: "File is too small to verify." };
  }

  const { fileTypeFromBuffer } = await import("file-type");
  const detected = await fileTypeFromBuffer(buffer);

  if (!detected || !ALLOWED_IMAGE_MIMES.has(detected.mime)) {
    return {
      ok: false,
      error: "Only JPEG, PNG, WebP, and GIF images are allowed.",
    };
  }

  return { ok: true, mime: detected.mime };
}

/** Decode a base64 file header sent by the client for pre-upload verification. */
export function decodeFileHeaderBase64(encoded: string): Uint8Array | null {
  try {
    const buf = Buffer.from(encoded, "base64");
    if (buf.length === 0 || buf.length > 8192) return null;
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

"use client";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB - mirrors the server route's own cap

/** Client-side check only, for fast feedback - the server route enforces
 * the same rules independently and is what actually matters. */
export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith("image/")) return "Only image files are allowed.";
  if (file.size > MAX_FILE_SIZE) return "Images must be under 5MB.";
  return null;
}

/** Presigns an upload URL, PUTs the file directly to R2, and returns the
 * resulting public URL. Throws (with a user-facing message) on any
 * failure - shared by ImageUpload.tsx and TiptapEditor.tsx's in-editor
 * image upload so the presign+PUT flow only lives in one place. */
export async function uploadImage(file: File): Promise<string> {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  const headerSlice = file.slice(0, Math.min(file.size, 4100));
  const headerBuffer = await headerSlice.arrayBuffer();
  const headerBytes = new Uint8Array(headerBuffer);
  let binary = "";
  for (let i = 0; i < headerBytes.length; i++) {
    binary += String.fromCharCode(headerBytes[i]!);
  }
  const fileHeaderBase64 = btoa(binary);

  const presignRes = await fetch("/api/admin/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      fileSize: file.size,
      fileHeaderBase64,
    }),
  });
  const presignBody = await presignRes.json();
  if (!presignRes.ok || !presignBody.ok) {
    throw new Error(presignBody.error || "Failed to prepare upload.");
  }

  const verifiedContentType = (presignBody.contentType as string) || file.type;

  const putRes = await fetch(presignBody.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": verifiedContentType },
    body: file,
  });
  if (!putRes.ok) {
    throw new Error("Upload failed. Please try again.");
  }

  return presignBody.publicUrl as string;
}

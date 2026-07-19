import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@/lib/supabase/server";
import { r2Client, R2_BUCKET_NAME } from "@/lib/r2";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const PRESIGNED_URL_TTL_SECONDS = 300; // 5 minutes

/** Strips anything unsafe from the original filename, keeping it readable
 * in the object key for debugging purposes only (uniqueness comes from
 * the UUID prefix, not this). */
function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 }) };

  const { data: profile } = await supabase.from("admin_profiles").select("id").eq("id", user.id).single();
  if (!profile) return { error: NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 }) };

  return { user };
}

type UploadRequestPayload = {
  filename?: unknown;
  contentType?: unknown;
  fileSize?: unknown;
};

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  let body: UploadRequestPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const filename = typeof body.filename === "string" ? body.filename : "";
  const contentType = typeof body.contentType === "string" ? body.contentType : "";
  const fileSize = typeof body.fileSize === "number" ? body.fileSize : 0;

  if (!filename || !contentType) {
    return NextResponse.json({ ok: false, error: "filename and contentType are required." }, { status: 400 });
  }
  // Server-side validation - the client validates too, for fast feedback,
  // but this is the check that actually matters.
  if (!contentType.startsWith("image/")) {
    return NextResponse.json({ ok: false, error: "Only image uploads are allowed." }, { status: 400 });
  }
  if (fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
    return NextResponse.json({ ok: false, error: "Images must be under 5MB." }, { status: 400 });
  }

  const key = `news/${crypto.randomUUID()}-${sanitizeFilename(filename)}`;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: PRESIGNED_URL_TTL_SECONDS });
  const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

  return NextResponse.json({ ok: true, uploadUrl, publicUrl, key });
}

type DeleteRequestPayload = {
  publicUrl?: unknown;
};

/**
 * Small admin-gated cleanup endpoint - deletes a single object, used when a
 * cover image (or in-editor image) is replaced so the old R2 object doesn't
 * sit around orphaned.
 *
 * Takes the full old publicUrl rather than a bare key deliberately:
 * R2_PUBLIC_URL is server-only (not NEXT_PUBLIC_-prefixed), so the client
 * has no way to know the prefix itself, either to decide whether a given
 * URL is "ours" or to derive its object key. The server already has
 * R2_PUBLIC_URL, so it does both here - if the URL doesn't match our own
 * domain (an old external URL from earlier testing, before uploads
 * existed), this quietly no-ops rather than erroring: "not ours to
 * delete" is a normal, expected case, not a failure.
 */
export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  let body: DeleteRequestPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const publicUrl = typeof body.publicUrl === "string" ? body.publicUrl : "";
  const prefix = `${process.env.R2_PUBLIC_URL}/`;
  if (!publicUrl.startsWith(prefix)) {
    return NextResponse.json({ ok: true, skipped: true });
  }
  const key = publicUrl.slice(prefix.length);
  if (!key.startsWith("news/")) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
  } catch (err) {
    console.error("Failed to delete R2 object:", key, err);
    return NextResponse.json({ ok: false, error: "Failed to delete image." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

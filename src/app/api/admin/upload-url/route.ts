import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireAdmin } from "@/lib/adminAuth";
import { getR2Client, R2_BUCKET_NAME } from "@/lib/r2";
import { buildNewsImageKey, isOwnedR2Key } from "@/lib/r2Storage";
import { decodeFileHeaderBase64, verifyImageMagicBytes } from "@/lib/imageMagicBytes";
import { ADMIN_RATE_LIMITS, checkAdminRateLimit, RATE_LIMIT_ERROR_MESSAGE } from "@/lib/rateLimit";
import { reportServerError } from "@/lib/sentryReport";

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

async function requireUploadAdmin(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth;

  const rate = await checkAdminRateLimit(
    request,
    auth.user.id,
    ADMIN_RATE_LIMITS.uploadUrl,
    "admin/upload-url",
  );
  if (!rate.success) {
    return { error: NextResponse.json({ ok: false, error: RATE_LIMIT_ERROR_MESSAGE }, { status: 429 }) };
  }

  return { user: auth.user };
}

type UploadRequestPayload = {
  filename?: unknown;
  contentType?: unknown;
  fileSize?: unknown;
  fileHeaderBase64?: unknown;
};

export async function POST(request: Request) {
  const auth = await requireUploadAdmin(request);
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
  const fileHeaderBase64 = typeof body.fileHeaderBase64 === "string" ? body.fileHeaderBase64 : "";

  if (!filename || !contentType || !fileHeaderBase64) {
    return NextResponse.json({
      ok: false,
      error: "filename, contentType, and fileHeaderBase64 are required.",
    }, { status: 400 });
  }

  if (fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
    return NextResponse.json({ ok: false, error: "Images must be under 5MB." }, { status: 400 });
  }

  const headerBytes = decodeFileHeaderBase64(fileHeaderBase64);
  if (!headerBytes) {
    return NextResponse.json({ ok: false, error: "Invalid file header for verification." }, { status: 400 });
  }

  const magic = await verifyImageMagicBytes(headerBytes);
  if (!magic.ok) {
    return NextResponse.json({ ok: false, error: magic.error }, { status: 400 });
  }

  const objectName = `${crypto.randomUUID()}-${sanitizeFilename(filename)}`;
  const key = buildNewsImageKey(objectName);

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: magic.mime,
  });
  const uploadUrl = await getSignedUrl(getR2Client(), command, { expiresIn: PRESIGNED_URL_TTL_SECONDS });
  const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

  return NextResponse.json({ ok: true, uploadUrl, publicUrl, key, contentType: magic.mime });
}

type DeleteRequestPayload = {
  publicUrl?: unknown;
};

/**
 * Small admin-gated cleanup endpoint - deletes a single object, used when a
 * cover image (or in-editor image) is replaced so the old R2 object doesn't
 * sit around orphaned.
 */
export async function DELETE(request: Request) {
  const auth = await requireUploadAdmin(request);
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
  if (!isOwnedR2Key(key)) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    await getR2Client().send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
  } catch (err) {
    console.error("Failed to delete R2 object:", key, err);
    reportServerError(err, {
      route: "/api/admin/upload-url",
      kind: "storage",
      extra: { op: "delete_object" },
    });
    return NextResponse.json({ ok: false, error: "Failed to delete image." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

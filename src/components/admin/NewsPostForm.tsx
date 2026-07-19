"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { generateHTML } from "@tiptap/html";
import type { JSONContent } from "@tiptap/core";
import { createClient } from "@/lib/supabase/client";
import TiptapEditor, { NEWS_EDITOR_EXTENSIONS } from "@/components/admin/TiptapEditor";
import ImageUpload from "@/components/admin/ImageUpload";

/** Best-effort cleanup - deletes the given old R2 object (the route itself
 * decides whether it's actually one of ours and no-ops otherwise). Never
 * blocks or fails the save itself: an orphaned object is a minor cleanup
 * issue, not worth risking the actual post save over. */
async function cleanupOldImage(oldUrl: string) {
  try {
    await fetch("/api/admin/upload-url", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicUrl: oldUrl }),
    });
  } catch (err) {
    console.error("Failed to clean up old R2 object:", oldUrl, err);
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Postgres unique_violation.
const UNIQUE_VIOLATION_CODE = "23505";

type ExistingPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  content: JSONContent | null;
  published: boolean;
  published_at: string | null;
};

/**
 * Shared by both /admin/news/new and /admin/news/[id]/edit - `postId`
 * undefined means create mode. Fetches the existing row client-side (same
 * browser-client, admin-session pattern as the rest of this dashboard) when
 * editing, rather than each page duplicating the load/save logic.
 */
export default function NewsPostForm({ postId }: { postId?: string }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(Boolean(postId));
  const [notFound, setNotFound] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const slugManuallyEdited = useRef(false);
  const [excerpt, setExcerpt] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const originalCoverImageUrl = useRef<string | null>(null);
  const [content, setContent] = useState<JSONContent | undefined>(undefined);
  const [existingPublishedAt, setExistingPublishedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!postId) return;
    (async () => {
      const { data, error: fetchError } = await supabase
        .from("news_posts")
        .select("id, title, slug, excerpt, cover_image_url, content, published, published_at")
        .eq("id", postId)
        .single();
      if (fetchError || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const post = data as ExistingPost;
      setTitle(post.title);
      setSlug(post.slug);
      slugManuallyEdited.current = true; // don't re-slugify an existing post's slug as edits happen
      setExcerpt(post.excerpt ?? "");
      setCoverImageUrl(post.cover_image_url);
      originalCoverImageUrl.current = post.cover_image_url;
      setContent(post.content ?? undefined);
      setExistingPublishedAt(post.published_at);
      setLoading(false);
    })();
  }, [postId, supabase]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugManuallyEdited.current) {
      setSlug(slugify(value));
    }
  };

  const handleSlugChange = (value: string) => {
    slugManuallyEdited.current = true;
    setSlug(value);
  };

  const save = async (publish: boolean) => {
    setError("");
    const trimmedTitle = title.trim();
    const trimmedSlug = slug.trim();
    if (!trimmedTitle || !trimmedSlug) {
      setError("Title and slug are both required.");
      return;
    }

    setSaving(publish ? "publish" : "draft");

    const contentHtml = content ? generateHTML(content, NEWS_EDITOR_EXTENSIONS) : "";
    const payload: Record<string, unknown> = {
      title: trimmedTitle,
      slug: trimmedSlug,
      excerpt: excerpt.trim() || null,
      cover_image_url: coverImageUrl,
      content: content ?? null,
      content_html: contentHtml,
      published: publish,
    };
    // Only set published_at if it isn't already set - re-publishing/editing
    // an already-published post must never overwrite its original date.
    if (publish && !existingPublishedAt) {
      payload.published_at = new Date().toISOString();
    }

    if (postId) {
      const { error: updateError } = await supabase.from("news_posts").update(payload).eq("id", postId);
      if (updateError) {
        setSaving(null);
        if (updateError.code === UNIQUE_VIOLATION_CODE) {
          setError("That slug is already in use - please choose a different one.");
        } else {
          console.error("Failed to update news post:", updateError);
          setError("Something went wrong saving this post. Please try again.");
        }
        return;
      }
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error: insertError } = await supabase.from("news_posts").insert({ ...payload, author_id: user?.id ?? null });
      if (insertError) {
        setSaving(null);
        if (insertError.code === UNIQUE_VIOLATION_CODE) {
          setError("That slug is already in use - please choose a different one.");
        } else {
          console.error("Failed to create news post:", insertError);
          setError("Something went wrong saving this post. Please try again.");
        }
        return;
      }
    }

    // Save succeeded - now clean up the old cover image if it was replaced
    // or removed (not just re-saved unchanged). Fires after the save
    // succeeds, never before: if the save itself had failed, the old
    // object must stay untouched.
    const oldUrl = originalCoverImageUrl.current;
    if (oldUrl && oldUrl !== coverImageUrl) {
      await cleanupOldImage(oldUrl);
    }

    setSaving(null);
    router.push("/admin/news");
    router.refresh();
  };

  if (loading) return <p className="text-sm text-ink/60">Loading…</p>;
  if (notFound) return <p className="text-sm text-madder">Post not found.</p>;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label htmlFor="post-title" className="block text-xs font-semibold uppercase tracking-wide text-ink/60">
          Title
        </label>
        <input
          id="post-title"
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="mt-1 w-full rounded-md border border-hairline bg-surface px-3 py-2 text-base text-ink outline-none focus-visible:border-gold"
        />
      </div>

      <div>
        <label htmlFor="post-slug" className="block text-xs font-semibold uppercase tracking-wide text-ink/60">
          Slug
        </label>
        <input
          id="post-slug"
          type="text"
          value={slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          className="mt-1 w-full rounded-md border border-hairline bg-surface px-3 py-2 text-base text-ink outline-none focus-visible:border-gold"
        />
        <p className="mt-1 text-xs text-ink/50">altfff.com/news/{slug || "…"}</p>
      </div>

      <div>
        <label htmlFor="post-excerpt" className="block text-xs font-semibold uppercase tracking-wide text-ink/60">
          Excerpt
        </label>
        <textarea
          id="post-excerpt"
          rows={3}
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          className="mt-1 w-full resize-none rounded-md border border-hairline bg-surface px-3 py-2 text-base text-ink outline-none focus-visible:border-gold"
        />
      </div>

      <div>
        <span className="block text-xs font-semibold uppercase tracking-wide text-ink/60">Cover Image</span>
        <div className="mt-1">
          <ImageUpload value={coverImageUrl} onChange={setCoverImageUrl} label="Cover Image" />
        </div>
      </div>

      <div>
        <span className="block text-xs font-semibold uppercase tracking-wide text-ink/60">Body</span>
        <div className="mt-1">
          <TiptapEditor content={content} onChange={setContent} />
        </div>
      </div>

      {error && (
        <p className="text-sm text-madder" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => save(false)}
          disabled={saving !== null}
          className="inline-flex items-center justify-center rounded-full border border-hairline px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-surface disabled:opacity-50"
        >
          {saving === "draft" ? "Saving…" : "Save as Draft"}
        </button>
        <button
          type="button"
          onClick={() => save(true)}
          disabled={saving !== null}
          className="inline-flex items-center justify-center rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          {saving === "publish" ? "Publishing…" : "Publish"}
        </button>
      </div>
    </div>
  );
}

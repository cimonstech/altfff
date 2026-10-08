"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Newspaper } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AdminCard from "@/components/admin/AdminCard";
import EmptyState from "@/components/ui/states/EmptyState";
import ErrorState from "@/components/ui/states/ErrorState";
import LoadingSkeleton from "@/components/ui/states/LoadingSkeleton";

type NewsPostRow = {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  created_at: string;
  published_at: string | null;
};

function formatDate(value: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB", { dateStyle: "medium" });
}

function StatusPill({ published }: { published: boolean }) {
  return (
    <span
      className={`inline-flex min-h-8 items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${
        published ? "bg-forest/15 text-forest" : "bg-ink/10 text-ink/60"
      }`}
    >
      {published ? "Published" : "Draft"}
    </span>
  );
}

function PostActions({
  post,
  deletingId,
  onDelete,
}: {
  post: NewsPostRow;
  deletingId: string | null;
  onDelete: (post: NewsPostRow) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <Link
        href={`/admin/news/${post.id}/edit`}
        className="inline-flex min-h-11 items-center px-1 text-sm font-semibold text-gold-deep hover:opacity-75"
      >
        Edit
      </Link>
      <button
        type="button"
        onClick={() => onDelete(post)}
        disabled={deletingId === post.id}
        className="inline-flex min-h-11 items-center px-1 text-sm font-semibold text-madder hover:opacity-75 disabled:opacity-50"
      >
        {deletingId === post.id ? "Deleting…" : "Delete"}
      </button>
    </div>
  );
}

export default function AdminNewsListPage() {
  const supabase = useMemo(() => createClient(), []);
  const [posts, setPosts] = useState<NewsPostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    const { data, error } = await supabase
      .from("news_posts")
      .select("id, title, slug, published, created_at, published_at")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Failed to load news posts:", error);
      setLoadError("Failed to load news posts. Please try again.");
      setPosts([]);
    } else {
      setPosts((data ?? []) as NewsPostRow[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleDelete = async (post: NewsPostRow) => {
    if (!window.confirm(`Delete "${post.title}"? This can't be undone.`)) return;
    setDeletingId(post.id);
    const { error } = await supabase.from("news_posts").delete().eq("id", post.id);
    if (error) {
      console.error("Failed to delete news post:", error);
      window.alert("Failed to delete post. Please try again.");
    } else {
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
    }
    setDeletingId(null);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-ink">News</h1>
        <Link
          href="/admin/news/new"
          className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition-opacity hover:opacity-85"
        >
          New Post
        </Link>
      </div>

      <p className="mt-3 text-xs text-ink/50">
        {loading ? "Loading…" : loadError ? "—" : `${posts.length} post${posts.length === 1 ? "" : "s"}`}
      </p>

      {loadError && (
        <ErrorState
          compact
          title="Could not load news"
          description={loadError}
          onRetry={() => void fetchPosts()}
          className="mt-4 rounded-xl border border-hairline bg-surface"
        />
      )}

      {loading && (
        <>
          <LoadingSkeleton variant="cards" className="mt-4 md:hidden" />
          <LoadingSkeleton variant="table" className="mt-4 hidden md:block" />
        </>
      )}

      {!loading && !loadError && posts.length === 0 && (
        <EmptyState
          icon={Newspaper}
          title="No news posts yet"
          description="Create your first post to publish updates on the public news page."
          className="mt-4"
          action={
            <Link
              href="/admin/news/new"
              className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition-opacity hover:opacity-85"
            >
              New Post
            </Link>
          }
        />
      )}

      {/* Mobile cards */}
      <ul className={`mt-4 flex flex-col gap-3 md:hidden ${loading || loadError ? "hidden" : ""}`}>
        {posts.map((post) => (
          <li key={post.id} className="rounded-md border border-hairline bg-surface p-4">
            <p className="font-medium text-ink">{post.title}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusPill published={post.published} />
              <span className="text-xs text-ink/50">{formatDate(post.created_at)}</span>
            </div>
            {post.published && (
              <p className="mt-1 text-xs text-ink/50">Published {formatDate(post.published_at)}</p>
            )}
            <div className="mt-2">
              <PostActions post={post} deletingId={deletingId} onDelete={handleDelete} />
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop table */}
      <AdminCard className={`mt-4 hidden overflow-hidden md:block ${loading || loadError ? "!hidden" : ""}`} padding="none">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-paper/60">
                <th scope="col" className="p-3 text-xs font-semibold uppercase tracking-wide text-ink/50">
                  Title
                </th>
                <th scope="col" className="p-3 text-xs font-semibold uppercase tracking-wide text-ink/50">
                  Status
                </th>
                <th scope="col" className="p-3 text-xs font-semibold uppercase tracking-wide text-ink/50">
                  Created
                </th>
                <th scope="col" className="p-3 text-xs font-semibold uppercase tracking-wide text-ink/50">
                  Published
                </th>
                <th scope="col" className="p-3 text-xs font-semibold uppercase tracking-wide text-ink/50">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-t border-hairline">
                  <td className="p-3 text-ink">{post.title}</td>
                  <td className="p-3">
                    <StatusPill published={post.published} />
                  </td>
                  <td className="p-3 text-ink">{formatDate(post.created_at)}</td>
                  <td className="p-3 text-ink">{post.published ? formatDate(post.published_at) : "-"}</td>
                  <td className="p-3">
                    <PostActions post={post} deletingId={deletingId} onDelete={handleDelete} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </div>
  );
}

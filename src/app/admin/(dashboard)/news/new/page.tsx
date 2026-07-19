"use client";

import NewsPostForm from "@/components/admin/NewsPostForm";

export default function NewNewsPostPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-ink">New Post</h1>
      <div className="mt-6 max-w-3xl">
        <NewsPostForm />
      </div>
    </div>
  );
}

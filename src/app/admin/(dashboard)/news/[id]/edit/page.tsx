"use client";

import { useParams } from "next/navigation";
import NewsPostForm from "@/components/admin/NewsPostForm";

export default function EditNewsPostPage() {
  const params = useParams<{ id: string }>();

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-ink">Edit Post</h1>
      <div className="mt-6 max-w-3xl">
        <NewsPostForm postId={params.id} />
      </div>
    </div>
  );
}

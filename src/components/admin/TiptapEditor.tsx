"use client";

import { useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapLink from "@tiptap/extension-link";
import TiptapImage from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import type { JSONContent } from "@tiptap/core";
import { uploadImage } from "@/lib/uploadImage";

/**
 * Shared extension set - imported by the create/edit pages too, so
 * generateHTML() (from @tiptap/html) builds content_html against the exact
 * same schema the editor itself used to produce the JSON. Keep these two
 * in sync; a mismatch here would make content_html silently diverge from
 * what the JSON actually represents.
 */
export const NEWS_EDITOR_EXTENSIONS = [
  // Tiptap v3's StarterKit bundles its own Link extension by default -
  // disabled here so the separately-configured TiptapLink below is the
  // only one registered. Without this, both get registered under the same
  // "link" name and Tiptap warns "Duplicate extension names found".
  StarterKit.configure({ link: false }),
  TiptapLink.configure({ openOnClick: false, autolink: true }),
  TiptapImage,
  Placeholder.configure({ placeholder: "Write the article body…" }),
];

function ToolbarButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`flex h-11 min-w-11 items-center justify-center rounded px-2.5 text-sm font-semibold ${
        active ? "bg-ink text-paper" : "text-ink hover:bg-paper"
      }`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const addLink = () => {
    const url = window.prompt("Link URL");
    if (!url) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const addImageByUrl = () => {
    const url = window.prompt("Image URL");
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setUploading(true);
    try {
      const publicUrl = await uploadImage(file);
      editor.chain().focus().setImage({ src: publicUrl }).run();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="-mx-px flex flex-wrap gap-1 overflow-x-auto border-b border-hairline p-2 [-ms-overflow-style:none] [scrollbar-width:thin]">
      <ToolbarButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        B
      </ToolbarButton>
      <ToolbarButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        I
      </ToolbarButton>
      <ToolbarButton
        label="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        label="Heading 3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </ToolbarButton>
      <ToolbarButton
        label="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        •-
      </ToolbarButton>
      <ToolbarButton
        label="Ordered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1.
      </ToolbarButton>
      <ToolbarButton
        label="Blockquote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        &ldquo;
      </ToolbarButton>
      <ToolbarButton label="Link" active={editor.isActive("link")} onClick={addLink}>
        Link
      </ToolbarButton>
      <ToolbarButton label="Upload image" onClick={() => fileInputRef.current?.click()}>
        {uploading ? "Uploading…" : "Img Upload"}
      </ToolbarButton>
      <ToolbarButton label="Insert image by URL" onClick={addImageByUrl}>
        Img URL
      </ToolbarButton>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
    </div>
  );
}

export default function TiptapEditor({
  content,
  onChange,
}: {
  /** Tiptap JSON document, or undefined/empty for a new post. */
  content?: JSONContent;
  onChange: (json: JSONContent) => void;
}) {
  const editor = useEditor({
    extensions: NEWS_EDITOR_EXTENSIONS,
    content: content ?? "",
    // Standard Tiptap v3 guidance for SSR frameworks - avoids a
    // hydration mismatch by not rendering the editor's initial state
    // until the client takes over.
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
    editorProps: {
      attributes: {
        class: "rich-text min-h-[300px] px-3 py-3 focus:outline-none",
      },
    },
  });

  return (
    <div className="rounded-md border border-hairline bg-surface">
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

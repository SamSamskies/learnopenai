"use client";

import { useEffect, useId, useRef, useState } from "react";

export function ImageGenApproval({
  open,
  initialPrompt,
  onGenerate,
  onCancel,
}: {
  open: boolean;
  initialPrompt: string;
  onGenerate: (prompt: string) => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState(initialPrompt);

  useEffect(() => {
    if (!open) return;
    setPrompt(initialPrompt);
    textareaRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, initialPrompt, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="absolute inset-0 bg-inverse-surface/40"
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md rounded-xl border border-outline-variant bg-background p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id={titleId}
          className="text-lg font-semibold text-foreground"
        >
          Generate this image?
        </h2>
        <label className="mt-4 block">
          <span className="sr-only">Image prompt</span>
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="w-full resize-y rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-container-low"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onGenerate(prompt.trim())}
            disabled={!prompt.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:bg-primary-dark disabled:opacity-50"
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}

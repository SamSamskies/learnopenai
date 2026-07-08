import type { RefObject } from "react";
import { PaperclipIcon, SendIcon, SparkleIcon, Spinner, StopIcon } from "./icons";

function resizeTextarea(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
}

export function ChatComposer({
  input,
  onInputChange,
  onSubmit,
  onKeyDown,
  uploadedFiles,
  uploadError,
  fileInputRef,
  textareaRef,
  onFileSelect,
  busy,
  uploading,
  refining,
  refined,
  onRefine,
  onUndoRefine,
  canSend,
  onStop,
}: {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  uploadedFiles: { name: string }[];
  uploadError: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onFileSelect: (file: File) => void;
  busy: boolean;
  uploading: boolean;
  refining: boolean;
  refined: boolean;
  onRefine: () => void;
  onUndoRefine: () => void;
  canSend: boolean;
  onStop: () => void;
}) {
  return (
    <div className="shrink-0 border-t border-outline-variant/60 bg-background">
      <div className="mx-auto max-w-[720px] px-6 py-4">
        {(uploadedFiles.length > 0 || uploadError) && (
          <div className="mb-3 flex flex-col gap-1.5">
            {uploadedFiles.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {uploadedFiles.map((f) => (
                  <li
                    key={f.name}
                    className="rounded-lg border border-outline-variant bg-surface-container-low px-2.5 py-1 text-xs text-on-surface-variant"
                  >
                    {f.name}
                  </li>
                ))}
              </ul>
            )}
            {uploadError && (
              <p className="text-sm text-error">{uploadError}</p>
            )}
          </div>
        )}

        {refining && (
          <div className="mb-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-foreground">
            <span>Refining your question…</span>
          </div>
        )}
        {refined && !refining && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-foreground">
            <span>Refined — review before sending</span>
            <button
              type="button"
              onClick={onUndoRefine}
              className="text-primary underline-offset-2 hover:underline"
            >
              Undo
            </button>
          </div>
        )}

        <form
          onSubmit={onSubmit}
          className="flex items-end gap-2 rounded-xl border border-outline-variant bg-background p-2 pl-3 transition-colors focus-within:border-outline"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.md,.txt"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileSelect(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy || uploading}
            aria-label="Upload document"
            className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PaperclipIcon />
          </button>
          <button
            type="button"
            onClick={onRefine}
            disabled={
              input.trim().length < 8 || busy || uploading || refining
            }
            aria-label="Refine question"
            className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {refining ? <Spinner className="h-5 w-5" /> : <SparkleIcon />}
          </button>
          <textarea
            ref={textareaRef}
            name="message"
            value={input}
            onChange={(e) => {
              onInputChange(e.target.value);
              resizeTextarea(e.target);
            }}
            onKeyDown={onKeyDown}
            rows={1}
            className="max-h-[200px] min-h-[36px] flex-1 resize-none bg-transparent py-2 text-base text-foreground outline-none placeholder:text-on-surface-variant/70 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder={
              busy ? "Generating response…" : "Message Research Assistant…"
            }
            disabled={busy || uploading}
          />
          {busy ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop generating"
              className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary transition-colors hover:bg-primary-dark"
            >
              <StopIcon />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSend}
              aria-label="Send message"
              className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-surface-container disabled:text-on-surface-variant/50"
            >
              <SendIcon />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useMemo, useRef, useState } from "react";
import { BriefArticle } from "./BriefArticle";
import {
  PaperclipIcon,
  PlusIcon,
  RetryIcon,
  SendIcon,
  Spinner,
  StopIcon,
  WarningIcon,
} from "./icons";
import { type ResearchUIState } from "@/lib/research-state";
import {
  getResearchPart,
  getUserText,
  type ResearchUIMessage,
} from "@/lib/research-ui-message";

const SESSION_KEY = "researchSessionId";
const appToken = process.env.NEXT_PUBLIC_RESEARCH_API_SECRET;

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (appToken) headers.Authorization = `Bearer ${appToken}`;
  return headers;
}

function formatBriefPreview(preview: string): string {
  try {
    return JSON.stringify(JSON.parse(preview), null, 2);
  } catch {
    return preview;
  }
}

function resizeTextarea(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
}

function SearchSkeletonCard() {
  return (
    <div className="mt-4 rounded-lg border border-outline-variant bg-surface-container-low p-4">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 shrink-0 animate-pulse rounded bg-surface-container" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3.5 w-3/4 animate-pulse rounded bg-surface-container" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-surface-container" />
        </div>
      </div>
    </div>
  );
}

function UserMessage({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-lg bg-surface-container-low px-4 py-3 text-base leading-relaxed text-foreground">
        {text}
      </div>
    </div>
  );
}

function searchStatusMessage(searched: boolean, searchedDocs: boolean): string {
  if (searchedDocs && searched) return "Searching documents and the web…";
  if (searchedDocs) return "Searching documents…";
  if (searched) return "Searching the web…";
  return "Working…";
}

function SearchingStatus({
  searched = false,
  searchedDocs = false,
}: {
  searched?: boolean;
  searchedDocs?: boolean;
}) {
  const isSearching = searched || searchedDocs;

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-on-surface-variant">
        <Spinner />
        <span>{searchStatusMessage(searched, searchedDocs)}</span>
      </div>
      {isSearching && <SearchSkeletonCard />}
    </div>
  );
}

function BriefPreviewPanel({
  preview,
  defaultOpen = false,
}: {
  preview: string;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="overflow-hidden rounded-lg border border-outline-variant"
    >
      <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low">
        Brief preview
      </summary>
      <pre className="overflow-x-auto border-t border-outline-variant px-4 py-3 font-mono text-sm leading-relaxed text-foreground whitespace-pre-wrap">
        {formatBriefPreview(preview)}
      </pre>
    </details>
  );
}

function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-lg border border-error/20 bg-error-container px-4 py-3 text-on-error-container">
        <WarningIcon />
        <p className="text-sm leading-relaxed">{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-container-low"
      >
        <RetryIcon />
        Try again
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center px-4 py-16 text-center sm:py-24">
      <h2 className="font-serif max-w-lg text-[28px] font-semibold leading-tight tracking-tight text-foreground sm:text-[32px]">
        What are you researching?
      </h2>
      <p className="mt-3 max-w-md text-base leading-relaxed text-on-surface-variant">
        Upload documents, ask complex questions, or explore the latest with
        authoritative sources.
      </p>
    </div>
  );
}

function StoppedNotice({
  state,
  canRegenerate,
  onRegenerate,
}: {
  state?: ResearchUIState;
  canRegenerate: boolean;
  onRegenerate: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-lg border border-outline-variant bg-surface-container-low px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
          Stopped
        </span>
        <span className="text-sm text-on-surface-variant">
          You stopped this response.
        </span>
      </div>

      {state?.briefPreview && (
        <BriefPreviewPanel preview={state.briefPreview} />
      )}

      {canRegenerate && (
        <button
          type="button"
          onClick={onRegenerate}
          className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-container-low"
        >
          <RetryIcon />
          Regenerate
        </button>
      )}
    </div>
  );
}

function LiveTurn({
  question,
  state,
  onRetry,
}: {
  question: string;
  state: ResearchUIState;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <UserMessage text={question} />

      {state.phase === "searching" && (
        <SearchingStatus
          searched={state.searched}
          searchedDocs={state.searchedDocs}
        />
      )}

      {state.phase === "streaming-answer" && state.briefPreview && (
        <BriefPreviewPanel preview={state.briefPreview} defaultOpen />
      )}

      {state.phase === "done" && state.brief && (
        <BriefArticle
          brief={state.brief}
          sources={state.sources}
          searched={state.searched}
          searchedDocs={state.searchedDocs}
        />
      )}

      {state.phase === "done" && state.briefPreview && (
        <BriefPreviewPanel preview={state.briefPreview} />
      )}

      {state.phase === "error" && (
        <ErrorBanner
          message={
            state.error ??
            "Something went wrong while searching. Please try again."
          }
          onRetry={onRetry}
        />
      )}
    </div>
  );
}

export function ResearchChat() {
  const [sessionId, setSessionId] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) return stored;
      const id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
      return id;
    }
    return crypto.randomUUID();
  });
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport<ResearchUIMessage>({
        api: "/api/research",
        headers: () => authHeaders(),
        body: () => ({ sessionId }),
      }),
    [sessionId]
  );

  const { messages, sendMessage, status, stop, error, regenerate } =
    useChat<ResearchUIMessage>({
      id: sessionId,
      transport,
    });

  const busy = status === "submitted" || status === "streaming";
  const canSend = input.trim().length > 0 && status === "ready" && !uploading;

  const turns = useMemo(() => {
    const result: Array<{
      user: ResearchUIMessage;
      assistant?: ResearchUIMessage;
    }> = [];

    for (const message of messages) {
      if (message.role === "user") {
        result.push({ user: message });
        continue;
      }
      if (message.role === "assistant" && result.length > 0) {
        result[result.length - 1].assistant = message;
      }
    }

    return result;
  }, [messages]);

  const isEmpty = turns.length === 0;

  async function uploadFile(file: File) {
    setUploading(true);
    setUploadError(null);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("sessionId", sessionId);

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: authHeaders(),
        body: form,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? `Upload failed (${res.status})`);
      }

      setUploadedFiles((prev) => [...prev, { name: data.file.name }]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function newChat() {
    stop();

    try {
      await fetch(`/api/session?id=${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
      });
    } catch {
      // ignore — client reset still applies
    }

    const id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
    setSessionId(id);
    setUploadedFiles([]);
    setUploadError(null);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function send(text: string) {
    const message = text.trim();
    if (!message || busy || uploading) return;
    sendMessage({ text: message });
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    send(input);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  function retryQuestion(question: string) {
    send(question);
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="shrink-0 border-b border-outline-variant/60">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between px-6 py-4">
          <span className="text-base font-semibold tracking-tight text-foreground">
            Research Assistant
          </span>
          <button
            type="button"
            onClick={() => void newChat()}
            disabled={busy || uploading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PlusIcon />
            New Chat
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[720px] px-6 py-8">
          {isEmpty && <EmptyState />}

          <div className="flex flex-col gap-10">
            {turns.map((turn, index) => {
              const assistant = turn.assistant;
              const research = assistant
                ? getResearchPart(assistant)?.data
                : undefined;
              const question = getUserText(turn.user);
              const isLast = index === turns.length - 1;
              const inFlight = isLast && busy;
              const interrupted =
                !!assistant &&
                !!research &&
                research.phase !== "done" &&
                research.phase !== "error";

              if (inFlight && research && assistant) {
                return (
                  <LiveTurn
                    key={assistant.id}
                    question={question}
                    state={research}
                    onRetry={() => retryQuestion(question)}
                  />
                );
              }

              if (inFlight && !assistant) {
                return (
                  <div key={turn.user.id} className="flex flex-col gap-6">
                    <UserMessage text={question} />
                    <SearchingStatus />
                  </div>
                );
              }

              return (
                <div key={turn.user.id} className="flex flex-col gap-6">
                  <UserMessage text={question} />
                  {research?.phase === "done" && research.brief && (
                    <>
                      <BriefArticle
                        brief={research.brief}
                        sources={research.sources}
                        searched={research.searched}
                        searchedDocs={research.searchedDocs}
                      />
                      {research.briefPreview && (
                        <BriefPreviewPanel preview={research.briefPreview} />
                      )}
                    </>
                  )}
                  {research?.phase === "error" && (
                    <ErrorBanner
                      message={
                        research.error ??
                        "Something went wrong while searching. Please try again."
                      }
                      onRetry={() => retryQuestion(question)}
                    />
                  )}
                  {interrupted && (
                    <StoppedNotice
                      state={research}
                      canRegenerate={isLast}
                      onRegenerate={() =>
                        regenerate({ messageId: assistant!.id })
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>

          {error && (
            <div className="mt-6">
              <ErrorBanner
                message={error.message}
                onRetry={() => {
                  const last = turns[turns.length - 1];
                  if (last) retryQuestion(getUserText(last.user));
                }}
              />
            </div>
          )}
        </div>
      </div>

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
                if (file) void uploadFile(file);
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
            <textarea
              ref={textareaRef}
              name="message"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
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
                onClick={() => stop()}
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
    </div>
  );
}

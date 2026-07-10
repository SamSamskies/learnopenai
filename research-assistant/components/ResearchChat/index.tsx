"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ModeChrome } from "../ModeChrome";
import { ConfirmDialog } from "../ConfirmDialog";
import { ChatComposer } from "./ChatComposer";
import { ErrorBanner } from "./ErrorBanner";
import { ChevronDownIcon, PlusIcon } from "./icons";
import { ResearchTurn } from "./ResearchTurn";
import {
  getUserText,
  type ResearchUIMessage,
} from "@/lib/research-ui-message";

const SESSION_KEY = "researchSessionId";
const NEAR_BOTTOM_THRESHOLD = 120;
const appToken = process.env.NEXT_PUBLIC_RESEARCH_API_SECRET;

function isNearBottom(container: HTMLElement) {
  return (
    container.scrollHeight - container.scrollTop - container.clientHeight <
    NEAR_BOTTOM_THRESHOLD
  );
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (appToken) headers.Authorization = `Bearer ${appToken}`;
  return headers;
}

function formatTransportError(error: Error): string {
  const msg = error.message.toLowerCase();

  if (error.name === "AbortError") {
    return "The request was cancelled.";
  }
  if (
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("load failed")
  ) {
    return "Connection problem — check your network and try again.";
  }
  if (msg.includes("401") || msg.includes("403") || msg.includes("unauthorized")) {
    return "You're not signed in. Refresh the page and try again.";
  }
  if (msg.includes("429") || msg.includes("rate limit")) {
    return "Too many requests — wait a moment and try again.";
  }
  if (msg.includes("500") || msg.includes("502") || msg.includes("503")) {
    return "Our servers hit a snag. Try again in a few seconds.";
  }

  return "Something went wrong. Please try again.";
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

export function ResearchChat() {
  const router = useRouter();
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
  const [refining, setRefining] = useState(false);
  const [refined, setRefined] = useState(false);
  const draftBeforeRefineRef = useRef<string | null>(null);
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
  const nothingToReset =
    isEmpty && uploadedFiles.length === 0 && !input.trim();

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

  const [confirmNewChat, setConfirmNewChat] = useState(false);
  const [pendingModeHref, setPendingModeHref] = useState<string | null>(null);

  const hasResearchWork =
    !isEmpty ||
    uploadedFiles.length > 0 ||
    input.trim().length > 0 ||
    busy ||
    uploading ||
    refining;

  function requestModeNavigate(href: string) {
    if (!hasResearchWork) {
      router.push(href);
      return;
    }
    setPendingModeHref(href);
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
    setRefined(false);
    draftBeforeRefineRef.current = null;
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastTurnRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const pendingScrollToTurnRef = useRef(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const lastTurnId = turns.at(-1)?.user.id;

  function scrollToBottom(smooth = true) {
    isNearBottomRef.current = true;
    setShowScrollButton(false);
    bottomRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
      block: "end",
    });
  }

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const onScroll = () => {
      const nearBottom = isNearBottom(container);
      isNearBottomRef.current = nearBottom;
      setShowScrollButton(!nearBottom && turns.length > 0);
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [turns.length]);

  useEffect(() => {
    if (!pendingScrollToTurnRef.current || !lastTurnId) return;
    pendingScrollToTurnRef.current = false;
    requestAnimationFrame(() => {
      lastTurnRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [lastTurnId]);

  useEffect(() => {
    if (!busy || !isNearBottomRef.current) return;
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    });
  }, [messages, busy]);

  function send(text: string) {
    const message = text.trim();
    if (!message || busy || uploading) return;
    pendingScrollToTurnRef.current = true;
    isNearBottomRef.current = true;
    setShowScrollButton(false);
    sendMessage({ text: message });
    setInput("");
    setRefined(false);
    draftBeforeRefineRef.current = null;
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  async function onRefine() {
    const draft = input.trim();
    if (draft.length < 8 || busy || uploading || refining) return;
    draftBeforeRefineRef.current = input;
    setRefining(true);
    try {
      const res = await fetch("/api/refine-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ draft }),
      });
      if (!res.ok) throw new Error("refine failed");
      const { refined: next } = await res.json();
      setInput(next);
      setRefined(true);
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (el) {
          el.style.height = "auto";
          el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
        }
        el?.focus();
      });
    } finally {
      setRefining(false);
    }
  }

  function undoRefine() {
    if (draftBeforeRefineRef.current != null) {
      setInput(draftBeforeRefineRef.current);
      draftBeforeRefineRef.current = null;
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (el) {
          el.style.height = "auto";
          el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
        }
      });
    }
    setRefined(false);
  }

  function onInputChange(value: string) {
    setInput(value);
    if (refined) setRefined(false);
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

  function retryTransportError() {
    const last = turns.at(-1);
    if (!last) return;

    if (last.assistant) {
      regenerate({ messageId: last.assistant.id });
      return;
    }

    // Failed before an assistant message existed — safe to re-send once
    send(getUserText(last.user));
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      <ModeChrome
        onRequestNavigate={requestModeNavigate}
        actions={
          <button
            type="button"
            onClick={() => {
              if (isEmpty && uploadedFiles.length === 0) {
                void newChat();
                return;
              }
              setConfirmNewChat(true);
            }}
            disabled={busy || uploading || nothingToReset}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PlusIcon />
            New Chat
          </button>
        }
      />

      <div className="relative flex-1 overflow-hidden">
        <div ref={scrollContainerRef} className="h-full overflow-y-auto">
          <div className="mx-auto max-w-[720px] px-6 py-8">
            {isEmpty && <EmptyState />}

            <div className="flex flex-col gap-10">
              {turns.map((turn, index) => (
                <ResearchTurn
                  key={turn.user.id}
                  ref={index === turns.length - 1 ? lastTurnRef : undefined}
                  turn={turn}
                  isLast={index === turns.length - 1}
                  busy={busy}
                  status={status}
                  onRegenerate={(messageId) => regenerate({ messageId })}
                />
              ))}
            </div>

            {error && (
              <div className="mt-6">
                <ErrorBanner
                  message={formatTransportError(error)}
                  onRetry={retryTransportError}
                />
              </div>
            )}

            <div ref={bottomRef} aria-hidden="true" className="h-16" />
          </div>
        </div>

        {showScrollButton && (
          <button
            type="button"
            onClick={() => scrollToBottom()}
            aria-label="Scroll to latest"
            className="absolute bottom-4 right-4 z-10 rounded-full border border-outline-variant bg-background p-2 shadow-md transition-colors hover:bg-surface-container-low"
          >
            <ChevronDownIcon />
          </button>
        )}
      </div>

      <ChatComposer
        input={input}
        onInputChange={onInputChange}
        onSubmit={onSubmit}
        onKeyDown={onKeyDown}
        uploadedFiles={uploadedFiles}
        uploadError={uploadError}
        fileInputRef={fileInputRef}
        textareaRef={textareaRef}
        onFileSelect={(file) => void uploadFile(file)}
        busy={busy}
        uploading={uploading}
        refining={refining}
        refined={refined}
        onRefine={() => void onRefine()}
        onUndoRefine={undoRefine}
        canSend={canSend}
        onStop={() => stop()}
        onVoiceMode={() => requestModeNavigate("/voice?start=1")}
      />

      <ConfirmDialog
        open={confirmNewChat}
        title="Start a new chat?"
        description="This clears your conversation and uploaded documents from this session. This can't be undone."
        confirmLabel="New chat"
        destructive
        onConfirm={() => {
          setConfirmNewChat(false);
          void newChat();
        }}
        onCancel={() => setConfirmNewChat(false)}
      />

      <ConfirmDialog
        open={pendingModeHref != null}
        title="Switch to Voice?"
        description="This leaves your research conversation. Chat history on this screen will be cleared."
        confirmLabel="Switch to Voice"
        destructive
        onConfirm={() => {
          const href = pendingModeHref;
          setPendingModeHref(null);
          if (href) router.push(href);
        }}
        onCancel={() => setPendingModeHref(null)}
      />
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import type { TranscriptState } from "./transcriptReducer";

export function Transcript({
  transcript,
}: {
  transcript: TranscriptState;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [followingLatest, setFollowingLatest] = useState(true);
  const hasTranscript =
    transcript.history.length > 0 ||
    transcript.draftUser ||
    transcript.draftAssistant;

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (followingLatest && scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [followingLatest, transcript]);

  if (!hasTranscript) return null;

  return (
    <div className="relative mt-6 w-full max-w-xl">
      <div
        ref={scrollRef}
        className="max-h-[40dvh] space-y-5 overflow-y-auto overscroll-contain rounded-xl border border-outline-variant bg-surface-container-low/40 px-4 py-4 text-base leading-relaxed text-foreground sm:px-5"
        aria-label="Conversation transcript"
        aria-live="polite"
        onScroll={(event) => {
          const element = event.currentTarget;
          const distanceFromBottom =
            element.scrollHeight - element.scrollTop - element.clientHeight;
          setFollowingLatest(distanceFromBottom < 32);
        }}
      >
        {transcript.history.map((turn, index) => (
          <p
            key={index}
            className={`whitespace-pre-wrap ${turn.role === "user" ? "ml-auto max-w-[85%] text-right" : "max-w-[90%]"}`}
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {turn.role}
            </span>
            <br />
            {turn.text}
          </p>
        ))}

        {transcript.draftUser && (
          <p className="ml-auto max-w-[85%] text-right text-foreground/70 whitespace-pre-wrap">
            <span className="text-xs text-on-surface-variant">
              You (transcribing…)
            </span>
            <br />
            {transcript.draftUser}
          </p>
        )}

        {transcript.draftAssistant && (
          <p className="max-w-[90%] text-foreground/90 whitespace-pre-wrap">
            <span className="text-xs text-on-surface-variant">Assistant</span>
            <br />
            {transcript.draftAssistant}
          </p>
        )}
      </div>

      {!followingLatest && (
        <button
          type="button"
          className="absolute right-3 bottom-3 rounded-lg border border-outline-variant bg-surface-container px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-surface-container-high"
          onClick={() => {
            setFollowingLatest(true);
            const scrollContainer = scrollRef.current;
            if (scrollContainer) {
              scrollContainer.scrollTo({
                top: scrollContainer.scrollHeight,
                behavior: "smooth",
              });
            }
          }}
        >
          Jump to latest
        </button>
      )}
    </div>
  );
}

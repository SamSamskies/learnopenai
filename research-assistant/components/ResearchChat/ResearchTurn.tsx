import type { ChatStatus } from "ai";
import { forwardRef } from "react";
import type { ResearchUIState } from "@/lib/research-state";
import { getResearchPart, getUserText, type ResearchUIMessage } from "@/lib/research-ui-message";
import { BriefArticle } from "./BriefArticle";
import { BriefPreviewPanel } from "./BriefPreviewPanel";
import { ErrorBanner } from "./ErrorBanner";
import {
  SearchingStatus,
  SubmittedAck,
  ThinkingGap,
} from "./InFlightStatus";
import { StoppedNotice } from "./StoppedNotice";

type InFlightPhase = "submitted" | "thinking" | "working";

function deriveInFlightPhase(
  status: ChatStatus,
  research?: ResearchUIState,
): InFlightPhase {
  if (status === "submitted") return "submitted";

  // Stream open — but no app progress yet
  if (!research) return "thinking";
  if (
    research.phase === "searching" &&
    !research.searched &&
    !research.searchedDocs
  ) {
    return "thinking";
  }

  return "working";
}

export type ResearchTurnData = {
  user: ResearchUIMessage;
  assistant?: ResearchUIMessage;
};

function UserMessage({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-lg bg-surface-container-low px-4 py-3 text-base leading-relaxed text-foreground">
        {text}
      </div>
    </div>
  );
}

export const ResearchTurn = forwardRef<
  HTMLDivElement,
  {
    turn: ResearchTurnData;
    isLast: boolean;
    busy: boolean;
    status: ChatStatus;
    onRegenerate: (messageId: string) => void;
  }
>(function ResearchTurn({ turn, isLast, busy, status, onRegenerate }, ref) {
  const assistant = turn.assistant;
  const research = assistant ? getResearchPart(assistant)?.data : undefined;
  const question = getUserText(turn.user);
  const inFlight = isLast && busy;
  const interrupted =
    !!assistant &&
    !!research &&
    research.phase !== "done" &&
    research.phase !== "error";

  const showWaitUI =
    inFlight && research?.phase !== "done" && research?.phase !== "error";

  if (showWaitUI) {
    const waitPhase = deriveInFlightPhase(status, research);

    return (
      <div ref={ref} className="flex flex-col gap-6">
        <UserMessage text={question} />

        {waitPhase === "submitted" && <SubmittedAck />}
        {waitPhase === "thinking" && <ThinkingGap />}
        {waitPhase === "working" && research && (
          <SearchingStatus
            searched={research.searched}
            searchedDocs={research.searchedDocs}
          />
        )}
        {waitPhase === "working" &&
          research?.phase === "streaming-answer" &&
          research.briefPreview && (
            <BriefPreviewPanel preview={research.briefPreview} defaultOpen />
          )}
      </div>
    );
  }

  return (
    <div ref={ref} className="flex flex-col gap-6">
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
      {research?.phase === "error" && assistant && (
        <ErrorBanner
          message={
            research.error ??
            "Something went wrong while searching. Please try again."
          }
          onRetry={() => onRegenerate(assistant.id)}
        />
      )}
      {interrupted && assistant && (
        <StoppedNotice
          state={research}
          canRegenerate={isLast}
          onRegenerate={() => onRegenerate(assistant.id)}
        />
      )}
    </div>
  );
});

import type { ChatStatus } from "ai";
import type { ResearchUIState } from "@/lib/research-state";

export type InFlightPhase = "submitted" | "thinking" | "working";

export function deriveInFlightPhase(
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

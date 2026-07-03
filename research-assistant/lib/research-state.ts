export type Citation = { title: string; url: string };

export type ResearchPhase =
  | "idle"
  | "searching"
  | "streaming-answer"
  | "done"
  | "error";

export type ResearchUIState = {
  phase: ResearchPhase;
  answerPreview: string;
  answer: string | null;
  citations: Citation[];
  searched: boolean;
  error: string | null;
};

export function dedupeCitations(citations: Citation[]): Citation[] {
  const seen = new Set<string>();
  return citations.filter((c) => {
    const key = citationKey(c.url);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function citationKey(url: string): string {
  try {
    return new URL(url).href.replace(/\/$/, "");
  } catch {
    return url;
  }
}

export function createResearchState(
  overrides: Partial<ResearchUIState> = {}
): ResearchUIState {
  return {
    phase: "idle",
    answerPreview: "",
    answer: null,
    citations: [],
    searched: false,
    error: null,
    ...overrides,
  };
}

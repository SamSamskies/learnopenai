const HANDOFF_KEY = "voiceResearchHandoff";

type VoiceTurn = {
  role: "user" | "assistant" | "system";
  text: string;
  interrupted?: boolean;
};

type VoiceHandoffSource = {
  history: VoiceTurn[];
  draftUser: string;
};

export function formatVoiceHandoff(
  source: VoiceHandoffSource,
): string | null {
  const pendingUser: VoiceTurn[] = source.draftUser.trim()
    ? [{ role: "user", text: source.draftUser }]
    : [];
  const turns = [...source.history, ...pendingUser]
    .filter((turn) => turn.role !== "system")
    .slice(-6);
  if (turns.length === 0) return null;

  const transcript = turns.map((turn) => {
    const interrupted = turn.interrupted ? " [interrupted]" : "";
    return `${turn.role === "user" ? "User" : "Assistant"}${interrupted}: ${turn.text.trim()}`;
  });

  return [
    "Continue this as a source-backed research task.",
    "Use this voice transcript as context:",
    "",
    ...transcript,
  ].join("\n");
}

export function saveVoiceHandoff(draft: string) {
  sessionStorage.setItem(HANDOFF_KEY, draft);
}

export function takeVoiceHandoff(): string | null {
  const draft = sessionStorage.getItem(HANDOFF_KEY);
  sessionStorage.removeItem(HANDOFF_KEY);
  return draft;
}

export function formatStagedResearchHandoff(
  source: VoiceHandoffSource,
  query: string,
): string | null {
  const trimmed = query.trim();
  const context = formatVoiceHandoff(source);
  if (!trimmed && !context) return null;
  const header = trimmed
    ? `Research this topic with sources: ${trimmed}`
    : "Continue this as a source-backed research task.";
  return context ? `${header}\n\n${context}` : header;
}

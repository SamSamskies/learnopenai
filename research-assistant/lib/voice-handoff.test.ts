import { describe, expect, it } from "vitest";
import { formatVoiceHandoff } from "./voice-handoff";

const PREFIX =
  "Continue this as a source-backed research task.\nUse this voice transcript as context:\n\n";

function turn(
  role: "user" | "assistant",
  text: string,
  interrupted?: boolean,
) {
  return { role, text, ...(interrupted ? { interrupted: true } : {}) };
}

describe("formatVoiceHandoff", () => {
  it("returns null for empty history and no pending user text", () => {
    expect(formatVoiceHandoff({ history: [], draftUser: "" })).toBeNull();
    expect(formatVoiceHandoff({ history: [], draftUser: "   " })).toBeNull();
  });

  it("includes pending user text as the final turn", () => {
    const draft = formatVoiceHandoff({
      history: [{ role: "assistant", text: "Earlier reply" }],
      draftUser: "Follow-up question",
    });

    expect(draft).toBe(
      `${PREFIX}Assistant: Earlier reply\nUser: Follow-up question`,
    );
  });

  it("labels interrupted assistant turns", () => {
    const draft = formatVoiceHandoff({
      history: [
        turn("user", "Question"),
        turn("assistant", "Partial answer", true),
      ],
      draftUser: "",
    });

    expect(draft).toBe(
      `${PREFIX}User: Question\nAssistant [interrupted]: Partial answer`,
    );
  });

  it("keeps only the last six turns including pending user text", () => {
    const history = Array.from({ length: 7 }, (_, i) =>
      turn("user", `Turn ${i + 1}`),
    );

    const draft = formatVoiceHandoff({
      history,
      draftUser: "Pending",
    });

    expect(draft).toBe(
      `${PREFIX}User: Turn 3\nUser: Turn 4\nUser: Turn 5\nUser: Turn 6\nUser: Turn 7\nUser: Pending`,
    );
  });

  it("trims turn text and ignores whitespace-only pending user", () => {
    const draft = formatVoiceHandoff({
      history: [{ role: "user", text: "  Spoken idea  " }],
      draftUser: "\n  ",
    });

    expect(draft).toBe(`${PREFIX}User: Spoken idea`);
  });

  it("does not include incomplete assistant output from the source shape", () => {
    const draft = formatVoiceHandoff({
      history: [{ role: "user", text: "Only committed history" }],
      draftUser: "",
    });

    expect(draft).not.toContain("draftAssistant");
    expect(draft).toBe(`${PREFIX}User: Only committed history`);
  });
});

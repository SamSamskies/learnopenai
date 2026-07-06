import { z } from "zod";

export const ResearchBrief = z.object({
  headline: z
    .string()
    .describe("One-line takeaway for a busy builder"),
  summary: z
    .string()
    .describe("Two or three sentences answering the question"),
  key_points: z
    .array(z.string())
    .describe("Three to five concise facts or implications"),
  confidence: z
    .enum(["low", "medium", "high"])
    .describe("How well the available sources support this answer"),
});

export type ResearchBrief = z.infer<typeof ResearchBrief>;
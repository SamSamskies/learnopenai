import { z } from "zod";

export const ResearchBrief = z.object({
  headline: z
    .string()
    .describe("One-line takeaway for a busy builder"),
  summary: z
    .string()
    .describe(
      "Two or three uncited sentences synthesizing the answer — no source markers"
    ),
  key_points: z
    .array(z.string())
    .describe(
      "Three to five concise facts or implications, each with source citations via annotations"
    ),
  confidence: z
    .enum(["low", "medium", "high"])
    .describe("How well the available sources support this answer"),
});

export type ResearchBrief = z.infer<typeof ResearchBrief>;
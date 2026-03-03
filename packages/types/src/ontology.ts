import { z } from "zod";

export const TermTypeSchema = z.enum(["entity", "relation", "attribute"]);
export type TermType = z.infer<typeof TermTypeSchema>;

export const ClassifiedTermSchema = z.object({
  label: z.string(),
  type: TermTypeSchema,
  definition: z.string(),
});
export type ClassifiedTerm = z.infer<typeof ClassifiedTermSchema>;

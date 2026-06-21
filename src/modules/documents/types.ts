import { z } from "zod";

export const uploadedDocumentSchema = z.object({
  id: z.string().uuid(),
  originalName: z.string(),
  size: z.number().int().positive(),
});

export type UploadedDocument = z.infer<typeof uploadedDocumentSchema>;

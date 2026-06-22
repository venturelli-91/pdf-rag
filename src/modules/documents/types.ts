import { z } from "zod";

export const uploadedDocumentSchema = z.object({
  id: z.string().uuid(),
  originalName: z.string(),
  size: z.number().int().positive(),
  status: z.enum(["pending", "indexed", "failed"]),
  chunkCount: z.number().int().nonnegative().optional(),
  error: z.string().optional(),
});

export type UploadedDocument = z.infer<typeof uploadedDocumentSchema>;

export type DocumentStatus = "pending" | "indexed" | "failed";

export interface DocumentRecord {
  id: string;
  originalName: string;
  size: number;
  storedAt: string;
  status: DocumentStatus;
  chunkCount?: number;
  indexedAt?: string;
  error?: string;
}

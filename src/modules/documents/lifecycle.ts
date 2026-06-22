import { readFile, rm } from "node:fs/promises";
import {
  indexChunks,
  reindexDocument as reindexInVectorStore,
  removeDocument,
} from "../vector-store";
import { DocumentNotFoundError } from "./errors";
import {
  addDocumentRecord,
  getDocumentRecord,
  listDocumentRecords,
  removeDocumentRecord,
  updateDocumentRecord,
} from "./manifest";
import { buildIndexableChunks } from "./pipeline";
import type { DocumentRecord } from "./types";
import { persistUpload } from "./upload";

export async function uploadAndIndexDocument(
  file: File,
): Promise<DocumentRecord> {
  const persisted = await persistUpload(file);
  const record: DocumentRecord = { ...persisted, status: "pending" };
  await addDocumentRecord(record);

  try {
    const buffer = await readFile(persisted.storedAt);
    const indexable = await buildIndexableChunks(buffer);
    await indexChunks(persisted.id, persisted.originalName, indexable);

    return updateDocumentRecord(persisted.id, {
      status: "indexed",
      chunkCount: indexable.length,
      indexedAt: new Date().toISOString(),
      error: undefined,
    });
  } catch (error) {
    return updateDocumentRecord(persisted.id, {
      status: "failed",
      error: error instanceof Error ? error.message : "Indexing failed.",
    });
  }
}

export async function listDocuments(): Promise<DocumentRecord[]> {
  return listDocumentRecords();
}

export async function deleteDocument(documentId: string): Promise<void> {
  const record = await getDocumentRecord(documentId);
  if (!record) {
    throw new DocumentNotFoundError(documentId);
  }

  await removeDocument(documentId);
  await rm(record.storedAt, { force: true });
  await removeDocumentRecord(documentId);
}

export async function reindexDocument(
  documentId: string,
): Promise<DocumentRecord> {
  const record = await getDocumentRecord(documentId);
  if (!record) {
    throw new DocumentNotFoundError(documentId);
  }

  try {
    const buffer = await readFile(record.storedAt);
    const indexable = await buildIndexableChunks(buffer);
    await reindexInVectorStore(documentId, record.originalName, indexable);

    return updateDocumentRecord(documentId, {
      status: "indexed",
      chunkCount: indexable.length,
      indexedAt: new Date().toISOString(),
      error: undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reindex failed.";
    await updateDocumentRecord(documentId, {
      status: "failed",
      error: message,
    });
    throw error;
  }
}

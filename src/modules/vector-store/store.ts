import * as lancedb from "@lancedb/lancedb";
import { VectorStoreError } from "./errors";
import type {
  ChunkRecord,
  IndexableChunk,
  SearchOptions,
  SearchResult,
} from "./types";

const TABLE_NAME = "chunks";
const DOCUMENT_ID_PATTERN = /^[0-9a-fA-F-]+$/;

function getDbUri(): string {
  return process.env.LANCEDB_URI ?? ".lancedb";
}

function assertSafeDocumentId(documentId: string): void {
  if (!DOCUMENT_ID_PATTERN.test(documentId)) {
    throw new VectorStoreError(
      `Invalid documentId: ${documentId}`,
      "INVALID_DOCUMENT_ID",
    );
  }
}

function toRecords(
  documentId: string,
  documentName: string,
  chunks: IndexableChunk[],
): ChunkRecord[] {
  return chunks.map((chunk) => ({
    vector: chunk.vector,
    text: chunk.text,
    documentId,
    documentName,
    pageNumber: chunk.pageNumber,
    chunkIndex: chunk.chunkIndex,
  }));
}

async function openTableIfExists(
  db: lancedb.Connection,
): Promise<lancedb.Table | undefined> {
  const tableNames = await db.tableNames();
  if (!tableNames.includes(TABLE_NAME)) {
    return undefined;
  }
  return db.openTable(TABLE_NAME);
}

export async function indexChunks(
  documentId: string,
  documentName: string,
  chunks: IndexableChunk[],
): Promise<void> {
  if (chunks.length === 0) {
    return;
  }

  try {
    const records = toRecords(documentId, documentName, chunks);
    const db = await lancedb.connect(getDbUri());
    const table = await openTableIfExists(db);

    const rows = records as unknown as Record<string, unknown>[];
    if (table) {
      await table.add(rows);
    } else {
      await db.createTable(TABLE_NAME, rows);
    }
  } catch (error) {
    if (error instanceof VectorStoreError) {
      throw error;
    }
    throw new VectorStoreError(
      "Failed to index chunks into the vector store.",
      "INDEX_FAILED",
    );
  }
}

export async function searchChunks(
  queryVector: number[],
  options: SearchOptions = {},
): Promise<SearchResult[]> {
  const { limit = 5, documentId } = options;

  if (documentId !== undefined) {
    assertSafeDocumentId(documentId);
  }

  try {
    const db = await lancedb.connect(getDbUri());
    const table = await openTableIfExists(db);
    if (!table) {
      return [];
    }

    let query = table.search(queryVector).limit(limit);
    if (documentId !== undefined) {
      query = query.where(`documentId = '${documentId}'`);
    }

    const rows = await query.toArray();
    return rows.map((row) => ({
      text: row.text,
      documentId: row.documentId,
      documentName: row.documentName,
      pageNumber: row.pageNumber,
      chunkIndex: row.chunkIndex,
      distance: row._distance,
    }));
  } catch (error) {
    if (error instanceof VectorStoreError) {
      throw error;
    }
    throw new VectorStoreError(
      "Failed to search the vector store.",
      "SEARCH_FAILED",
    );
  }
}

export async function removeDocument(documentId: string): Promise<void> {
  assertSafeDocumentId(documentId);

  try {
    const db = await lancedb.connect(getDbUri());
    const table = await openTableIfExists(db);
    if (!table) {
      return;
    }
    await table.delete(`documentId = '${documentId}'`);
  } catch (error) {
    if (error instanceof VectorStoreError) {
      throw error;
    }
    throw new VectorStoreError(
      "Failed to remove document from the vector store.",
      "DELETE_FAILED",
    );
  }
}

export async function reindexDocument(
  documentId: string,
  documentName: string,
  chunks: IndexableChunk[],
): Promise<void> {
  await removeDocument(documentId);
  await indexChunks(documentId, documentName, chunks);
}

import type { ParsedDocument } from "@/modules/pdf-parser";
import { ChunkingError } from "./errors";
import type { Chunk, ChunkingOptions } from "./types";

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;

function splitWithOverlap(
  text: string,
  chunkSize: number,
  chunkOverlap: number,
): string[] {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const pieces: string[] = [];
  let start = 0;

  while (start < trimmed.length) {
    let end = Math.min(start + chunkSize, trimmed.length);

    if (end < trimmed.length) {
      const lastSpace = trimmed.lastIndexOf(" ", end);
      if (lastSpace > start) {
        end = lastSpace;
      }
    }

    const piece = trimmed.slice(start, end).trim();
    if (piece.length > 0) {
      pieces.push(piece);
    }

    if (end >= trimmed.length) {
      break;
    }
    // Always advance past the previous start, regardless of where the
    // word-boundary search landed, so overlap can never stall the loop.
    start = Math.max(start + 1, end - chunkOverlap);
  }

  return pieces;
}

export function chunkDocument(
  document: ParsedDocument,
  options: ChunkingOptions = {},
): Chunk[] {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const chunkOverlap = options.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;

  if (chunkSize <= 0) {
    throw new ChunkingError(
      "chunkSize must be greater than 0.",
      "INVALID_OPTIONS",
    );
  }
  if (chunkOverlap < 0 || chunkOverlap >= chunkSize) {
    throw new ChunkingError(
      "chunkOverlap must be between 0 and chunkSize (exclusive).",
      "INVALID_OPTIONS",
    );
  }

  const chunks: Chunk[] = [];
  let chunkIndex = 0;

  // Chunks never span pages, so every chunk maps back to exactly one page
  // for unambiguous page-level citations later (FR09).
  for (const page of document.pages) {
    for (const text of splitWithOverlap(page.text, chunkSize, chunkOverlap)) {
      chunks.push({ text, pageNumber: page.pageNumber, chunkIndex });
      chunkIndex += 1;
    }
  }

  return chunks;
}

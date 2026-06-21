import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  MAX_UPLOAD_SIZE_BYTES,
  PDF_MAGIC_BYTES,
  PDF_MIME_TYPE,
} from "./constants";
import { DocumentUploadError } from "./errors";

const STORAGE_DIR =
  process.env.DOCUMENTS_STORAGE_DIR ??
  path.join(process.cwd(), ".data", "uploads");

export interface PersistedDocument {
  id: string;
  originalName: string;
  size: number;
  storedAt: string;
}

function assertUploadIsAllowed(file: File): void {
  if (file.size === 0) {
    throw new DocumentUploadError("File is empty.", "EMPTY");
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new DocumentUploadError(
      `File exceeds the ${MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)}MB limit.`,
      "TOO_LARGE",
    );
  }

  if (file.type && file.type !== PDF_MIME_TYPE) {
    throw new DocumentUploadError(
      "Only PDF files are accepted.",
      "INVALID_TYPE",
    );
  }
}

function assertContentIsPdf(buffer: Buffer): void {
  const header = buffer.subarray(0, PDF_MAGIC_BYTES.length);
  if (!header.equals(PDF_MAGIC_BYTES)) {
    throw new DocumentUploadError(
      "File content is not a valid PDF.",
      "INVALID_TYPE",
    );
  }
}

export async function persistUpload(file: File): Promise<PersistedDocument> {
  assertUploadIsAllowed(file);

  const buffer = Buffer.from(await file.arrayBuffer());
  assertContentIsPdf(buffer);

  const id = randomUUID();
  await mkdir(STORAGE_DIR, { recursive: true });
  const storedAt = path.join(STORAGE_DIR, `${id}.pdf`);
  await writeFile(storedAt, buffer);

  return { id, originalName: file.name, size: buffer.byteLength, storedAt };
}

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DocumentNotFoundError } from "./errors";
import type { DocumentRecord } from "./types";

function getManifestPath(): string {
  return (
    process.env.DOCUMENTS_MANIFEST_PATH ??
    path.join(/* turbopackIgnore: true */ process.cwd(), ".data", "documents.json")
  );
}

async function readManifest(): Promise<DocumentRecord[]> {
  try {
    const raw = await readFile(getManifestPath(), "utf-8");
    return JSON.parse(raw) as DocumentRecord[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function writeManifest(records: DocumentRecord[]): Promise<void> {
  const manifestPath = getManifestPath();
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, JSON.stringify(records, null, 2));
}

export async function addDocumentRecord(record: DocumentRecord): Promise<void> {
  const records = await readManifest();
  records.push(record);
  await writeManifest(records);
}

export async function listDocumentRecords(): Promise<DocumentRecord[]> {
  return readManifest();
}

export async function getDocumentRecord(
  id: string,
): Promise<DocumentRecord | undefined> {
  const records = await readManifest();
  return records.find((record) => record.id === id);
}

export async function updateDocumentRecord(
  id: string,
  patch: Partial<DocumentRecord>,
): Promise<DocumentRecord> {
  const records = await readManifest();
  const index = records.findIndex((record) => record.id === id);

  if (index === -1) {
    throw new DocumentNotFoundError(id);
  }

  const updated = { ...records[index], ...patch };
  records[index] = updated;
  await writeManifest(records);
  return updated;
}

export async function removeDocumentRecord(id: string): Promise<void> {
  const records = await readManifest();
  await writeManifest(records.filter((record) => record.id !== id));
}

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { DocumentNotFoundError } from "./errors";
import {
  addDocumentRecord,
  getDocumentRecord,
  listDocumentRecords,
  removeDocumentRecord,
  updateDocumentRecord,
} from "./manifest";
import type { DocumentRecord } from "./types";

function buildRecord(overrides: Partial<DocumentRecord> = {}): DocumentRecord {
  return {
    id: "doc-1",
    originalName: "report.pdf",
    size: 1024,
    storedAt: "/tmp/doc-1.pdf",
    status: "pending",
    ...overrides,
  };
}

describe("documents manifest", () => {
  let manifestDir: string;

  beforeEach(async () => {
    manifestDir = await mkdtemp(path.join(tmpdir(), "pdf-rag-manifest-test-"));
    process.env.DOCUMENTS_MANIFEST_PATH = path.join(
      manifestDir,
      "documents.json",
    );
  });

  afterEach(async () => {
    process.env.DOCUMENTS_MANIFEST_PATH = undefined;
    await rm(manifestDir, { recursive: true, force: true });
  });

  it("returns an empty list when the manifest file does not exist yet", async () => {
    expect(await listDocumentRecords()).toEqual([]);
  });

  it("adds and lists a document record", async () => {
    const record = buildRecord();
    await addDocumentRecord(record);

    expect(await listDocumentRecords()).toEqual([record]);
  });

  it("gets an existing record by id", async () => {
    const record = buildRecord();
    await addDocumentRecord(record);

    expect(await getDocumentRecord("doc-1")).toEqual(record);
  });

  it("returns undefined when getting a missing record", async () => {
    expect(await getDocumentRecord("missing")).toBeUndefined();
  });

  it("updates an existing record by merging the patch", async () => {
    await addDocumentRecord(buildRecord());

    const updated = await updateDocumentRecord("doc-1", {
      status: "indexed",
      chunkCount: 3,
    });

    expect(updated).toEqual(buildRecord({ status: "indexed", chunkCount: 3 }));
    expect(await getDocumentRecord("doc-1")).toEqual(updated);
  });

  it("throws DocumentNotFoundError when updating a missing record", async () => {
    await expect(
      updateDocumentRecord("missing", { status: "indexed" }),
    ).rejects.toBeInstanceOf(DocumentNotFoundError);
  });

  it("removes an existing record", async () => {
    await addDocumentRecord(buildRecord());
    await removeDocumentRecord("doc-1");

    expect(await listDocumentRecords()).toEqual([]);
  });

  it("does not throw when removing a missing record", async () => {
    await expect(removeDocumentRecord("missing")).resolves.toBeUndefined();
  });
});

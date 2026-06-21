import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PDFDocument } from "pdf-lib";

async function buildValidPdfFile(name = "valid.pdf"): Promise<File> {
  const document = await PDFDocument.create();
  document.addPage([200, 200]);
  const bytes = await document.save();
  return new File([bytes], name, { type: "application/pdf" });
}

describe("persistUpload", () => {
  let storageDir: string;
  let persistUpload: typeof import("./upload").persistUpload;

  beforeEach(async () => {
    storageDir = await mkdtemp(path.join(tmpdir(), "pdf-rag-upload-test-"));
    process.env.DOCUMENTS_STORAGE_DIR = storageDir;
    jest.resetModules();
    ({ persistUpload } = await import("./upload"));
  });

  afterEach(async () => {
    process.env.DOCUMENTS_STORAGE_DIR = undefined;
    await rm(storageDir, { recursive: true, force: true });
  });

  it("persists a valid PDF to disk and returns its metadata", async () => {
    const file = await buildValidPdfFile("report.pdf");

    const result = await persistUpload(file);

    expect(result.originalName).toBe("report.pdf");
    expect(result.size).toBeGreaterThan(0);
    expect(result.storedAt).toBe(path.join(storageDir, `${result.id}.pdf`));

    const written = await readFile(result.storedAt);
    expect(written.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("rejects an empty file", async () => {
    const file = new File([], "empty.pdf", { type: "application/pdf" });
    await expect(persistUpload(file)).rejects.toMatchObject({ code: "EMPTY" });
  });

  it("rejects a file that is too large", async () => {
    const oversized = new Uint8Array(51 * 1024 * 1024);
    const file = new File([oversized], "huge.pdf", { type: "application/pdf" });
    await expect(persistUpload(file)).rejects.toMatchObject({
      code: "TOO_LARGE",
    });
  });

  it("rejects a non-PDF mime type", async () => {
    const file = new File(["plain text"], "notes.txt", { type: "text/plain" });
    await expect(persistUpload(file)).rejects.toMatchObject({
      code: "INVALID_TYPE",
    });
  });

  it("rejects content whose bytes are not a real PDF", async () => {
    const file = new File(["not a pdf"], "fake.pdf", {
      type: "application/pdf",
    });
    await expect(persistUpload(file)).rejects.toMatchObject({
      code: "INVALID_TYPE",
    });
  });

  it("rejects a corrupt PDF that has a valid header but unreadable structure", async () => {
    const file = new File(
      ["%PDF-1.4\nnot really a pdf body\n"],
      "corrupt.pdf",
      {
        type: "application/pdf",
      },
    );
    await expect(persistUpload(file)).rejects.toMatchObject({
      code: "CORRUPT",
    });
  });
});

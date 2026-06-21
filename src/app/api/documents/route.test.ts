import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PDFDocument } from "pdf-lib";

async function buildValidPdfFile(name = "valid.pdf"): Promise<File> {
  const document = await PDFDocument.create();
  document.addPage([200, 200]);
  const bytes = await document.save();
  return new File([bytes], name, { type: "application/pdf" });
}

describe("POST /api/documents", () => {
  let storageDir: string;
  let POST: typeof import("./route").POST;

  beforeEach(async () => {
    storageDir = await mkdtemp(path.join(tmpdir(), "pdf-rag-route-test-"));
    process.env.DOCUMENTS_STORAGE_DIR = storageDir;
    jest.resetModules();
    ({ POST } = await import("./route"));
  });

  afterEach(async () => {
    process.env.DOCUMENTS_STORAGE_DIR = undefined;
    await rm(storageDir, { recursive: true, force: true });
  });

  function buildRequest(formData: FormData): Request {
    return new Request("http://localhost/api/documents", {
      method: "POST",
      body: formData,
    });
  }

  it("returns 201 with document metadata for a valid PDF", async () => {
    const formData = new FormData();
    formData.set("file", await buildValidPdfFile("report.pdf"));

    const response = await POST(buildRequest(formData));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({ originalName: "report.pdf" });
    expect(typeof body.id).toBe("string");
  });

  it("returns 400 when no file is provided", async () => {
    const response = await POST(buildRequest(new FormData()));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/no file/i);
  });

  it("returns 400 with a clear message for an invalid file type", async () => {
    const formData = new FormData();
    formData.set(
      "file",
      new File(["hello"], "notes.txt", { type: "text/plain" }),
    );

    const response = await POST(buildRequest(formData));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Only PDF files are accepted.");
  });

  it("returns 400 for a corrupt PDF", async () => {
    const formData = new FormData();
    formData.set(
      "file",
      new File(["%PDF-1.4\nnot really a pdf body\n"], "corrupt.pdf", {
        type: "application/pdf",
      }),
    );

    const response = await POST(buildRequest(formData));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("File is corrupt or not a readable PDF.");
  });
});

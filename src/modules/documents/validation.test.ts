import { PDFDocument } from "pdf-lib";
import { DocumentUploadError } from "./errors";
import { assertPdfIsReadable } from "./validation";

async function buildPdfBuffer(pageCount: number): Promise<Buffer> {
  const document = await PDFDocument.create();
  for (let i = 0; i < pageCount; i += 1) {
    document.addPage([200, 200]);
  }
  return Buffer.from(await document.save());
}

// A page-less PDF can't round-trip through pdf-lib's own save(), which always
// produces at least one page, so this fixture is built from raw PDF syntax.
const PAGELESS_PDF = Buffer.from(
  [
    "%PDF-1.4",
    "1 0 obj",
    "<< /Type /Catalog /Pages 2 0 R >>",
    "endobj",
    "2 0 obj",
    "<< /Type /Pages /Kids [] /Count 0 >>",
    "endobj",
    "trailer",
    "<< /Size 3 /Root 1 0 R >>",
    "%%EOF",
  ].join("\n"),
);

describe("assertPdfIsReadable", () => {
  it("resolves for a valid PDF with at least one page", async () => {
    const buffer = await buildPdfBuffer(1);
    await expect(assertPdfIsReadable(buffer)).resolves.toBeUndefined();
  });

  it("rejects a PDF with no pages", async () => {
    await expect(assertPdfIsReadable(PAGELESS_PDF)).rejects.toMatchObject({
      code: "CORRUPT",
    });
  });

  it("rejects a buffer that is not a parseable PDF", async () => {
    const buffer = Buffer.from(
      "%PDF-1.4\nthis is garbage and not a real pdf body\n",
    );
    await expect(assertPdfIsReadable(buffer)).rejects.toBeInstanceOf(
      DocumentUploadError,
    );
    await expect(assertPdfIsReadable(buffer)).rejects.toMatchObject({
      code: "CORRUPT",
    });
  });
});

import { PDFDocument, StandardFonts } from "pdf-lib";
import { PdfParsingError } from "./errors";
import { parsePdf } from "./parser";

async function buildPdfWithText(pageTexts: string[]): Promise<Buffer> {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);

  for (const text of pageTexts) {
    const page = document.addPage([300, 300]);
    page.drawText(text, { x: 20, y: 150, size: 20, font });
  }

  return Buffer.from(await document.save());
}

const GARBAGE_PDF = Buffer.from(
  "%PDF-1.4\nthis is garbage and not a real pdf body\n",
);

describe("parsePdf", () => {
  it("extracts text per page with page number metadata", async () => {
    const buffer = await buildPdfWithText(["Hello world", "Second page"]);

    const result = await parsePdf(buffer);

    expect(result.pages).toHaveLength(2);
    expect(result.pages[0].pageNumber).toBe(1);
    expect(result.pages[0].text).toContain("Hello world");
    expect(result.pages[1].pageNumber).toBe(2);
    expect(result.pages[1].text).toContain("Second page");
  });

  it("rejects a buffer that is not a parseable PDF", async () => {
    await expect(parsePdf(GARBAGE_PDF)).rejects.toBeInstanceOf(PdfParsingError);
    await expect(parsePdf(GARBAGE_PDF)).rejects.toMatchObject({
      code: "UNREADABLE",
    });
  });
});

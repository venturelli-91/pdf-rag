import { PDFParse } from "pdf-parse";
import { PdfParsingError } from "./errors";
import type { ParsedDocument } from "./types";

export async function parsePdf(buffer: Buffer): Promise<ParsedDocument> {
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    return {
      pages: result.pages.map((page) => ({
        pageNumber: page.num,
        text: page.text,
      })),
    };
  } catch {
    throw new PdfParsingError(
      "File is corrupt or not a readable PDF.",
      "UNREADABLE",
    );
  } finally {
    await parser.destroy();
  }
}

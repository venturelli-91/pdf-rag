import { PDFDocument } from "pdf-lib";
import { DocumentUploadError } from "./errors";

export async function assertPdfIsReadable(buffer: Buffer): Promise<void> {
  let pageCount: number;

  try {
    const document = await PDFDocument.load(buffer, { updateMetadata: false });
    pageCount = document.getPageCount();
  } catch {
    throw new DocumentUploadError(
      "File is corrupt or not a readable PDF.",
      "CORRUPT",
    );
  }

  if (pageCount === 0) {
    throw new DocumentUploadError("PDF has no pages.", "CORRUPT");
  }
}

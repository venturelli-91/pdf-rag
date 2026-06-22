import {
  DocumentUploadError,
  listDocuments,
  uploadAndIndexDocument,
  uploadedDocumentSchema,
} from "@/modules/documents";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  try {
    const document = await uploadAndIndexDocument(file);
    const body = uploadedDocumentSchema.parse({
      id: document.id,
      originalName: document.originalName,
      size: document.size,
      status: document.status,
      chunkCount: document.chunkCount,
      error: document.error,
    });
    return NextResponse.json(body, { status: 201 });
  } catch (error) {
    if (error instanceof DocumentUploadError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

export async function GET() {
  const documents = await listDocuments();
  return NextResponse.json({ documents }, { status: 200 });
}

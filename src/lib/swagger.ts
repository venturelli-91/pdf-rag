import { createSwaggerSpec } from "next-swagger-doc";

export function getApiDocs(): object {
  return createSwaggerSpec({
    apiFolder: "src/app/api",
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Open PDF RAG API",
        version: "0.1.0",
        description:
          "Local-first RAG API for uploading PDFs and asking grounded, cited questions about them.",
      },
    },
  });
}

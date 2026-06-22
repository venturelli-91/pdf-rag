import { GET } from "./route";

describe("GET /api/docs", () => {
  it("returns a generated OpenAPI spec", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.openapi).toBe("3.0.0");
    expect(body.info).toMatchObject({ title: "Open PDF RAG API" });
    expect(body.paths).toBeDefined();
  });

  it("documents the existing API routes", async () => {
    const response = await GET();
    const body = await response.json();

    expect(Object.keys(body.paths)).toEqual(
      expect.arrayContaining([
        "/api/documents",
        "/api/documents/{id}",
        "/api/documents/{id}/reindex",
        "/api/query",
      ]),
    );
  });
});

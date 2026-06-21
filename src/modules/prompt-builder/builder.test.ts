import { buildGroundedPrompt } from "./builder";

const chunks = [
  {
    text: "Photosynthesis converts light energy into chemical energy.",
    documentId: "doc-1",
    documentName: "biology.pdf",
    pageNumber: 3,
    chunkIndex: 0,
    score: 0.12,
  },
  {
    text: "Chlorophyll absorbs light primarily in the blue and red wavelengths.",
    documentId: "doc-1",
    documentName: "biology.pdf",
    pageNumber: 4,
    chunkIndex: 1,
    score: 0.2,
  },
];

describe("buildGroundedPrompt", () => {
  it("instructs the model to answer only from the provided context", () => {
    const prompt = buildGroundedPrompt("What is photosynthesis?", chunks);

    expect(prompt.system).toMatch(/only.*context/i);
  });

  it("instructs the model to express uncertainty when context is insufficient", () => {
    const prompt = buildGroundedPrompt("What is photosynthesis?", chunks);

    expect(prompt.system).toMatch(
      /don't know|not enough information|cannot answer/i,
    );
  });

  it("instructs the model to answer concisely", () => {
    const prompt = buildGroundedPrompt("What is photosynthesis?", chunks);

    expect(prompt.system).toMatch(/concise/i);
  });

  it("includes the question and each chunk's text, source and page in the user prompt", () => {
    const prompt = buildGroundedPrompt("What is photosynthesis?", chunks);

    expect(prompt.user).toContain("What is photosynthesis?");
    expect(prompt.user).toContain(
      "Photosynthesis converts light energy into chemical energy.",
    );
    expect(prompt.user).toContain("biology.pdf");
    expect(prompt.user).toContain("3");
    expect(prompt.user).toContain(
      "Chlorophyll absorbs light primarily in the blue and red wavelengths.",
    );
    expect(prompt.user).toContain("4");
  });

  it("indicates explicitly when no context was found", () => {
    const prompt = buildGroundedPrompt("What is photosynthesis?", []);

    expect(prompt.user).toMatch(/no relevant context|no context/i);
  });
});

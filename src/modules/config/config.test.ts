import {
  getChunkingConfig,
  getDeepseekConfig,
  getGenerationProvider,
  getOllamaConfig,
  getRetrievalConfig,
} from "./config";

const ENV_KEYS = [
  "CHUNKING_CHUNK_SIZE",
  "CHUNKING_CHUNK_OVERLAP",
  "RETRIEVAL_TOP_K",
  "RETRIEVAL_SCORE_THRESHOLD",
  "OLLAMA_BASE_URL",
  "OLLAMA_EMBEDDING_MODEL",
  "OLLAMA_GENERATION_MODEL",
  "GENERATION_PROVIDER",
  "DEEPSEEK_API_KEY",
  "DEEPSEEK_BASE_URL",
  "DEEPSEEK_MODEL",
];

describe("config", () => {
  afterEach(() => {
    for (const key of ENV_KEYS) {
      Reflect.deleteProperty(process.env, key);
    }
  });

  describe("getChunkingConfig", () => {
    it("defaults to chunkSize 1000 and chunkOverlap 200 when unset", () => {
      expect(getChunkingConfig()).toEqual({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
    });

    it("reads chunkSize and chunkOverlap from env vars", () => {
      process.env.CHUNKING_CHUNK_SIZE = "500";
      process.env.CHUNKING_CHUNK_OVERLAP = "50";

      expect(getChunkingConfig()).toEqual({ chunkSize: 500, chunkOverlap: 50 });
    });

    it("allows a chunkOverlap of 0", () => {
      process.env.CHUNKING_CHUNK_OVERLAP = "0";

      expect(getChunkingConfig().chunkOverlap).toBe(0);
    });

    it("falls back to defaults for invalid values", () => {
      process.env.CHUNKING_CHUNK_SIZE = "not-a-number";
      process.env.CHUNKING_CHUNK_OVERLAP = "-5";

      expect(getChunkingConfig()).toEqual({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
    });
  });

  describe("getRetrievalConfig", () => {
    it("defaults to topK 5 and an undefined scoreThreshold when unset", () => {
      expect(getRetrievalConfig()).toEqual({
        topK: 5,
        scoreThreshold: undefined,
      });
    });

    it("reads topK and scoreThreshold from env vars", () => {
      process.env.RETRIEVAL_TOP_K = "8";
      process.env.RETRIEVAL_SCORE_THRESHOLD = "0.3";

      expect(getRetrievalConfig()).toEqual({ topK: 8, scoreThreshold: 0.3 });
    });

    it("falls back to the default topK for an invalid value", () => {
      process.env.RETRIEVAL_TOP_K = "not-a-number";

      expect(getRetrievalConfig().topK).toBe(5);
    });

    it("leaves scoreThreshold undefined for an invalid value", () => {
      process.env.RETRIEVAL_SCORE_THRESHOLD = "not-a-number";

      expect(getRetrievalConfig().scoreThreshold).toBeUndefined();
    });
  });

  describe("getOllamaConfig", () => {
    it("defaults baseUrl, embeddingModel, and generationModel when unset", () => {
      expect(getOllamaConfig()).toEqual({
        baseUrl: "http://localhost:11434",
        embeddingModel: "nomic-embed-text",
        generationModel: "llama3.2",
      });
    });

    it("reads all three from env vars", () => {
      process.env.OLLAMA_BASE_URL = "http://ollama.internal:1234";
      process.env.OLLAMA_EMBEDDING_MODEL = "custom-embed";
      process.env.OLLAMA_GENERATION_MODEL = "custom-llm";

      expect(getOllamaConfig()).toEqual({
        baseUrl: "http://ollama.internal:1234",
        embeddingModel: "custom-embed",
        generationModel: "custom-llm",
      });
    });
  });

  describe("getGenerationProvider", () => {
    it("defaults to deepseek when unset", () => {
      expect(getGenerationProvider()).toBe("deepseek");
    });

    it("reads an explicit ollama value from env", () => {
      process.env.GENERATION_PROVIDER = "ollama";

      expect(getGenerationProvider()).toBe("ollama");
    });

    it("reads an explicit deepseek value from env", () => {
      process.env.GENERATION_PROVIDER = "deepseek";

      expect(getGenerationProvider()).toBe("deepseek");
    });

    it("falls back to the default for an invalid value", () => {
      process.env.GENERATION_PROVIDER = "openai";

      expect(getGenerationProvider()).toBe("deepseek");
    });
  });

  describe("getDeepseekConfig", () => {
    it("defaults baseUrl and model, and an empty apiKey, when unset", () => {
      expect(getDeepseekConfig()).toEqual({
        apiKey: "",
        baseUrl: "https://api.deepseek.com",
        model: "deepseek-chat",
      });
    });

    it("reads all three from env vars", () => {
      process.env.DEEPSEEK_API_KEY = "sk-test";
      process.env.DEEPSEEK_BASE_URL = "https://deepseek.internal";
      process.env.DEEPSEEK_MODEL = "deepseek-reasoner";

      expect(getDeepseekConfig()).toEqual({
        apiKey: "sk-test",
        baseUrl: "https://deepseek.internal",
        model: "deepseek-reasoner",
      });
    });
  });
});

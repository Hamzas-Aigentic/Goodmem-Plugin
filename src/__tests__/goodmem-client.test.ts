import { describe, it, expect, vi, beforeEach } from "vitest";
import { GoodmemClient } from "../goodmem-client.js";

function mockFetchResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "OK",
    headers: new Headers({ "content-type": "application/json" }),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

describe("GoodmemClient", () => {
  let client: GoodmemClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    client = new GoodmemClient({
      apiUrl: "https://localhost:8080",
      apiKey: "test-api-key",
    });
  });

  describe("createReranker", () => {
    it("sends POST to /v1/rerankers with correct body", async () => {
      const reranker = {
        rerankerId: "rr-123",
        displayName: "cohere-reranker",
        providerType: "COHERE",
        modelIdentifier: "rerank-v3",
        endpointUrl: "https://api.cohere.com",
      };
      fetchMock.mockResolvedValue(mockFetchResponse(reranker));

      const result = await client.createReranker({
        displayName: "cohere-reranker",
        providerType: "COHERE",
        endpointUrl: "https://api.cohere.com",
        modelIdentifier: "rerank-v3",
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localhost:8080/v1/rerankers");
      expect(opts.method).toBe("POST");
      const body = JSON.parse(opts.body);
      expect(body.displayName).toBe("cohere-reranker");
      expect(body.providerType).toBe("COHERE");
      expect(body.modelIdentifier).toBe("rerank-v3");
      expect(result.rerankerId).toBe("rr-123");
    });
  });

  describe("listRerankers", () => {
    it("sends GET to /v1/rerankers and returns rerankers array", async () => {
      const rerankers = [
        {
          rerankerId: "rr-1",
          displayName: "r1",
          providerType: "COHERE",
          modelIdentifier: "m1",
          endpointUrl: "https://example.com",
        },
      ];
      fetchMock.mockResolvedValue(mockFetchResponse({ rerankers }));

      const result = await client.listRerankers();

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localhost:8080/v1/rerankers");
      expect(opts.method).toBe("GET");
      expect(result).toEqual(rerankers);
    });
  });

  describe("getReranker", () => {
    it("sends GET to /v1/rerankers/{id}", async () => {
      const reranker = {
        rerankerId: "rr-123",
        displayName: "r1",
        providerType: "COHERE",
        modelIdentifier: "m1",
        endpointUrl: "https://example.com",
      };
      fetchMock.mockResolvedValue(mockFetchResponse(reranker));

      const result = await client.getReranker("rr-123");

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localhost:8080/v1/rerankers/rr-123");
      expect(opts.method).toBe("GET");
      expect(result.rerankerId).toBe("rr-123");
    });
  });

  describe("deleteReranker", () => {
    it("sends DELETE to /v1/rerankers/{id}", async () => {
      fetchMock.mockResolvedValue(
        mockFetchResponse(undefined, 200)
      );
      // Override for no-content response
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers({}),
        json: () => Promise.resolve(undefined),
        text: () => Promise.resolve(""),
      } as unknown as Response);

      await client.deleteReranker("rr-123");

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localhost:8080/v1/rerankers/rr-123");
      expect(opts.method).toBe("DELETE");
    });
  });

  describe("ocrDocument", () => {
    it("sends POST to /v1/ocr:document with correct body", async () => {
      const ocrResult = { detectedFormat: "PDF", pageCount: 3, pages: [{ markdown: "extracted text" }] };
      fetchMock.mockResolvedValue(mockFetchResponse(ocrResult));

      const result = await client.ocrDocument({
        content: "base64data",
        format: "PDF",
        includeMarkdown: true,
      });

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localhost:8080/v1/ocr:document");
      expect(opts.method).toBe("POST");
      const body = JSON.parse(opts.body);
      expect(body.content).toBe("base64data");
      expect(body.format).toBe("PDF");
      expect(body.includeMarkdown).toBe(true);
      expect(result.pageCount).toBe(3);
    });
  });

  describe("batchGetMemories", () => {
    it("sends POST to /v1/memories:batchGet", async () => {
      const memories = [
        { memoryId: "m-1", spaceId: "sp-1" },
        { memoryId: "m-2", spaceId: "sp-1" },
      ];
      fetchMock.mockResolvedValue(mockFetchResponse({ memories }));

      const result = await client.batchGetMemories(["m-1", "m-2"]);

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localhost:8080/v1/memories:batchGet");
      expect(opts.method).toBe("POST");
      const body = JSON.parse(opts.body);
      expect(body.requests).toEqual([{ memoryId: "m-1" }, { memoryId: "m-2" }]);
      expect(result).toEqual(memories);
    });
  });

  describe("getEmbedder", () => {
    it("sends GET to /v1/embedders/{id}", async () => {
      const embedder = {
        embedderId: "emb-123",
        displayName: "test-embedder",
        modelIdentifier: "model-1",
        dimensionality: 1536,
        providerType: "OPENAI",
        distributionType: "DENSE",
        endpointUrl: "https://api.openai.com/v1",
      };
      fetchMock.mockResolvedValue(mockFetchResponse(embedder));

      const result = await client.getEmbedder("emb-123");

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localhost:8080/v1/embedders/emb-123");
      expect(opts.method).toBe("GET");
      expect(result.embedderId).toBe("emb-123");
    });
  });

  describe("getLLM", () => {
    it("sends GET to /v1/llms/{id}", async () => {
      const llm = {
        llmId: "llm-123",
        displayName: "test-llm",
        providerType: "OPENAI",
        modelIdentifier: "gpt-4",
        endpointUrl: "https://openrouter.ai/api/v1",
      };
      fetchMock.mockResolvedValue(mockFetchResponse(llm));

      const result = await client.getLLM("llm-123");

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localhost:8080/v1/llms/llm-123");
      expect(opts.method).toBe("GET");
      expect(result.llmId).toBe("llm-123");
    });
  });
});

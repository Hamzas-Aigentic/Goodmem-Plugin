// ── Interfaces ──────────────────────────────────────────────────────────────

export type ProviderType =
  | "OPENAI"
  | "VLLM"
  | "TEI"
  | "LLAMA_CPP"
  | "VOYAGE"
  | "COHERE"
  | "JINA";

export type DistributionType = "DENSE" | "SPARSE";

export interface EndpointCredentials {
  kind?: string;
  apiKey?: {
    inlineSecret?: string;
    headerName?: string;
    prefix?: string;
  };
}

export interface CreateEmbedderParams {
  displayName: string;
  providerType: ProviderType;
  endpointUrl: string;
  modelIdentifier: string;
  dimensionality: number;
  distributionType: DistributionType;
  apiPath?: string;
  description?: string;
  credentials?: EndpointCredentials;
  maxSequenceLength?: number;
  supportedModalities?: string[];
  labels?: Record<string, string>;
  version?: string;
}

export interface Embedder {
  embedderId: string;
  displayName: string;
  modelIdentifier: string;
  dimensionality: number | string;
  providerType: string;
  distributionType: string;
  endpointUrl: string;
  apiPath?: string;
  description?: string;
  labels?: string | Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
}

export interface SpaceEmbedder {
  embedderId: string;
  defaultRetrievalWeight?: number | string;
}

export interface ChunkingConfig {
  none?: Record<string, never>;
  recursive?: {
    chunkSize?: number;
    chunkOverlap?: number;
    separators?: string[];
    keepStrategy?: "KEEP_END" | "KEEP_START";
    separatorIsRegex?: boolean;
    lengthMeasurement?: "CHARACTER_COUNT" | "TOKEN_COUNT";
  };
  sentence?: {
    maxChunkSize?: number;
    minChunkSize?: number;
    enableLanguageDetection?: boolean;
    lengthMeasurement?: "CHARACTER_COUNT" | "TOKEN_COUNT";
  };
}

export interface CreateSpaceParams {
  name: string;
  defaultChunkingConfig: ChunkingConfig;
  spaceEmbedders?: SpaceEmbedder[];
  labels?: Record<string, string>;
  publicRead?: boolean;
}

export interface Space {
  spaceId: string;
  name: string;
  spaceEmbedders?: SpaceEmbedder[];
  labels?: string | Record<string, string>;
  publicRead?: string | boolean;
  defaultChunkingConfig?: ChunkingConfig;
  createdAt?: string;
  updatedAt?: string;
  ownerId?: string;
}

export interface UpdateSpaceParams {
  name?: string;
  publicRead?: boolean;
  replaceLabels?: Record<string, string>;
  mergeLabels?: Record<string, string>;
}

export interface CreateMemoryParams {
  spaceId: string;
  originalContent: string;
  contentType: string;
  metadata?: Record<string, string>;
  chunkingConfig?: ChunkingConfig;
}

export interface Memory {
  memoryId: string;
  spaceId: string;
  contentType?: string;
  processingStatus?: string;
  originalContentLength?: number | string;
  originalContentSha256?: string;
  metadata?: string | Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
}

export interface PostProcessor {
  name: string;
  config: Record<string, unknown>;
}

export interface RetrieveParams {
  spaceId: string;
  message: string;
  requestedSize?: number;
  filter?: string;
  fetchMemory?: boolean;
  fetchMemoryContent?: boolean;
  postProcessor?: PostProcessor;
}

export interface ChunkData {
  chunkId: string;
  memoryId: string;
  chunkText: string;
  chunkSequenceNumber?: number;
  vectorStatus?: string;
  relevanceScore?: number | string;
}

export interface RetrievedItem {
  chunk: {
    resultSetId?: string;
    chunk: ChunkData;
    memoryIndex?: number;
    relevanceScore: number | string;
  };
}

export interface RetrieveResult {
  items: RetrievedItem[];
  abstractReply?: string;
}

export interface BatchDeleteRequest {
  memoryId?: string;
  filterSelector?: {
    spaceId: string;
    statusFilter?: string;
    filter?: string;
  };
}

export interface BatchDeleteResult {
  results: Array<{
    success: boolean | string;
    memoryId?: string;
    error?: { code: string; message: string };
  }>;
}

export interface CreateRerankerParams {
  displayName: string;
  providerType: string;
  endpointUrl: string;
  modelIdentifier: string;
  apiPath?: string;
  credentials?: EndpointCredentials;
}

export interface Reranker {
  rerankerId: string;
  displayName: string;
  providerType: string;
  modelIdentifier: string;
  endpointUrl: string;
}

export interface OcrDocumentParams {
  content: string;
  contentType: string;
}

export interface OcrResult {
  text: string;
  pages?: number;
}

export interface CreateLLMParams {
  displayName: string;
  providerType: string;
  endpointUrl: string;
  modelIdentifier: string;
  apiPath?: string;
  credentials?: EndpointCredentials;
}

export interface LLM {
  llmId: string;
  displayName: string;
  providerType: string;
  modelIdentifier: string;
  endpointUrl: string;
}

// ── Client ──────────────────────────────────────────────────────────────────

export class GoodmemClient {
  private apiUrl: string;
  private apiKey: string;
  private fetchOptions: Record<string, unknown>;

  constructor(opts: {
    apiUrl: string;
    apiKey: string;
    dispatcher?: unknown;
  }) {
    this.apiUrl = opts.apiUrl.replace(/\/+$/, "");
    this.apiKey = opts.apiKey;
    this.fetchOptions = opts.dispatcher
      ? { dispatcher: opts.dispatcher }
      : {};
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.apiUrl}${path}`;
    const headers: Record<string, string> = {
      "x-api-key": this.apiKey,
      "Content-Type": "application/json",
    };

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        ...this.fetchOptions,
      } as RequestInit);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : String(err);
      const causeCode =
        err instanceof Error &&
        err.cause &&
        typeof err.cause === "object" &&
        "code" in err.cause
          ? (err.cause as { code: string }).code
          : undefined;

      if (
        causeCode === "DEPTH_ZERO_SELF_SIGNED_CERT" ||
        causeCode === "SELF_SIGNED_CERT_IN_CHAIN"
      ) {
        throw new Error(
          `TLS certificate verification failed for ${this.apiUrl}. ` +
            `If Goodmem uses a self-signed certificate, ensure ` +
            `GOODMEM_TLS_REJECT_UNAUTHORIZED is not set to "1".`
        );
      }

      if (
        message.includes("ECONNREFUSED") ||
        message.includes("fetch failed")
      ) {
        throw new Error(
          `Cannot connect to Goodmem at ${this.apiUrl}. ` +
            `Goodmem is not running. Start it with: goodmem system install`
        );
      }
      throw new Error(`Request failed: ${method} ${path} - ${message}`);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Goodmem API error: ${method} ${path} returned ${res.status} ${res.statusText}` +
          (text ? ` - ${text}` : "")
      );
    }

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return (await res.json()) as T;
    }
    return undefined as unknown as T;
  }

  /**
   * Make a raw fetch request and return the Response directly.
   * Used for streaming endpoints (NDJSON/SSE).
   */
  private async rawRequest(
    method: string,
    path: string,
    body?: unknown,
    accept?: string
  ): Promise<Response> {
    const url = `${this.apiUrl}${path}`;
    const headers: Record<string, string> = {
      "x-api-key": this.apiKey,
      "Content-Type": "application/json",
    };
    if (accept) {
      headers["Accept"] = accept;
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...this.fetchOptions,
    } as RequestInit);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Goodmem API error: ${method} ${path} returned ${res.status} ${res.statusText}` +
          (text ? ` - ${text}` : "")
      );
    }

    return res;
  }

  // ── Ping ────────────────────────────────────────────────────────────────

  async ping(): Promise<boolean> {
    try {
      await this.request<unknown>("GET", "/health");
      return true;
    } catch {
      return false;
    }
  }

  // ── Embedders ───────────────────────────────────────────────────────────

  async createEmbedder(params: CreateEmbedderParams): Promise<Embedder> {
    const body: Record<string, unknown> = {
      displayName: params.displayName,
      providerType: params.providerType,
      endpointUrl: params.endpointUrl,
      modelIdentifier: params.modelIdentifier,
      dimensionality: params.dimensionality,
      distributionType: params.distributionType,
    };
    if (params.apiPath !== undefined) body.apiPath = params.apiPath;
    if (params.description !== undefined) body.description = params.description;
    if (params.credentials !== undefined) body.credentials = params.credentials;
    if (params.maxSequenceLength !== undefined)
      body.maxSequenceLength = params.maxSequenceLength;
    if (params.supportedModalities !== undefined)
      body.supportedModalities = params.supportedModalities;
    if (params.labels !== undefined) body.labels = params.labels;
    if (params.version !== undefined) body.version = params.version;

    return this.request<Embedder>("POST", "/v1/embedders", body);
  }

  async listEmbedders(): Promise<Embedder[]> {
    const res = await this.request<{ embedders: Embedder[] }>(
      "GET",
      "/v1/embedders"
    );
    return res.embedders ?? [];
  }

  // ── Spaces ──────────────────────────────────────────────────────────────

  async createSpace(params: CreateSpaceParams): Promise<Space> {
    const body: Record<string, unknown> = {
      name: params.name,
      defaultChunkingConfig: params.defaultChunkingConfig,
    };
    if (params.spaceEmbedders !== undefined)
      body.spaceEmbedders = params.spaceEmbedders;
    if (params.labels !== undefined) body.labels = params.labels;
    if (params.publicRead !== undefined) body.publicRead = params.publicRead;

    return this.request<Space>("POST", "/v1/spaces", body);
  }

  async listSpaces(): Promise<Space[]> {
    const res = await this.request<{ spaces: Space[] }>("GET", "/v1/spaces");
    return res.spaces ?? [];
  }

  async getSpace(id: string): Promise<Space> {
    return this.request<Space>("GET", `/v1/spaces/${id}`);
  }

  async updateSpace(id: string, params: UpdateSpaceParams): Promise<Space> {
    const body: Record<string, unknown> = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.publicRead !== undefined) body.publicRead = params.publicRead;
    if (params.replaceLabels !== undefined)
      body.replaceLabels = params.replaceLabels;
    if (params.mergeLabels !== undefined) body.mergeLabels = params.mergeLabels;

    return this.request<Space>("PUT", `/v1/spaces/${id}`, body);
  }

  async deleteSpace(id: string): Promise<void> {
    await this.request<void>("DELETE", `/v1/spaces/${id}`);
  }

  // ── Memories ────────────────────────────────────────────────────────────

  async createMemory(params: CreateMemoryParams): Promise<Memory> {
    const body: Record<string, unknown> = {
      spaceId: params.spaceId,
      originalContent: params.originalContent,
      contentType: params.contentType,
    };
    if (params.metadata !== undefined) body.metadata = params.metadata;
    if (params.chunkingConfig !== undefined)
      body.chunkingConfig = params.chunkingConfig;

    return this.request<Memory>("POST", "/v1/memories", body);
  }

  async createMemoriesBatch(
    params: CreateMemoryParams[]
  ): Promise<Array<{ success: boolean | string; memoryId?: string; memory?: Memory }>> {
    const res = await this.request<{
      results: Array<{ success: boolean | string; memoryId?: string; memory?: Memory }>;
    }>("POST", "/v1/memories:batchCreate", {
      requests: params.map((p) => ({
        spaceId: p.spaceId,
        originalContent: p.originalContent,
        contentType: p.contentType,
        ...(p.metadata !== undefined && { metadata: p.metadata }),
        ...(p.chunkingConfig !== undefined && {
          chunkingConfig: p.chunkingConfig,
        }),
      })),
    });
    return res.results ?? [];
  }

  async getMemory(id: string): Promise<Memory> {
    return this.request<Memory>("GET", `/v1/memories/${id}`);
  }

  async getMemoryContent(id: string): Promise<string> {
    const res = await this.rawRequest("GET", `/v1/memories/${id}/content`);
    return await res.text();
  }

  async deleteMemory(id: string): Promise<void> {
    await this.request<void>("DELETE", `/v1/memories/${id}`);
  }

  async batchDeleteMemories(
    requests: BatchDeleteRequest[]
  ): Promise<BatchDeleteResult> {
    return this.request<BatchDeleteResult>(
      "POST",
      "/v1/memories:batchDelete",
      { requests }
    );
  }

  async listMemories(spaceId: string, limit?: number): Promise<Memory[]> {
    const query = limit !== undefined ? `?limit=${limit}` : "";
    const res = await this.request<{ memories: Memory[] }>(
      "GET",
      `/v1/spaces/${spaceId}/memories${query}`
    );
    return res.memories ?? [];
  }

  // ── Retrieval ───────────────────────────────────────────────────────────

  async retrieveMemories(params: RetrieveParams): Promise<RetrieveResult> {
    const body: Record<string, unknown> = {
      message: params.message,
      spaceKeys: [
        {
          spaceId: params.spaceId,
          ...(params.filter !== undefined && { filter: params.filter }),
        },
      ],
    };
    if (params.requestedSize !== undefined)
      body.requestedSize = params.requestedSize;
    if (params.fetchMemory !== undefined)
      body.fetchMemory = params.fetchMemory;
    if (params.fetchMemoryContent !== undefined)
      body.fetchMemoryContent = params.fetchMemoryContent;
    if (params.postProcessor !== undefined)
      body.postProcessor = params.postProcessor;

    // Request NDJSON streaming response
    const res = await this.rawRequest(
      "POST",
      "/v1/memories:retrieve",
      body,
      "application/x-ndjson"
    );

    const text = await res.text();
    const items: RetrievedItem[] = [];
    const replyParts: string[] = [];

    // Parse NDJSON — each line is a separate JSON object
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const obj = JSON.parse(trimmed);
        if (obj.retrievedItem) {
          items.push(obj.retrievedItem as RetrievedItem);
        }
        if (obj.abstractReply?.text) {
          replyParts.push(obj.abstractReply.text);
        }
      } catch {
        // Skip malformed lines
      }
    }

    const result: RetrieveResult = { items };
    if (replyParts.length > 0) {
      result.abstractReply = replyParts.join("");
    }
    return result;
  }

  // ── LLMs ─────────────────────────────────────────────────────────────────

  async createLLM(params: CreateLLMParams): Promise<LLM> {
    const body: Record<string, unknown> = {
      displayName: params.displayName,
      providerType: params.providerType,
      endpointUrl: params.endpointUrl,
      modelIdentifier: params.modelIdentifier,
    };
    if (params.apiPath !== undefined) body.apiPath = params.apiPath;
    if (params.credentials !== undefined) body.credentials = params.credentials;

    return this.request<LLM>("POST", "/v1/llms", body);
  }

  async listLLMs(): Promise<LLM[]> {
    const res = await this.request<{ llms: LLM[] }>("GET", "/v1/llms");
    return res.llms ?? [];
  }

  async deleteLLM(id: string): Promise<void> {
    await this.request<void>("DELETE", `/v1/llms/${id}`);
  }

  async getLLM(id: string): Promise<LLM> {
    return this.request<LLM>("GET", `/v1/llms/${id}`);
  }

  // ── Embedder by ID ──────────────────────────────────────────────────────

  async getEmbedder(id: string): Promise<Embedder> {
    return this.request<Embedder>("GET", `/v1/embedders/${id}`);
  }

  // ── Rerankers ──────────────────────────────────────────────────────────

  async createReranker(params: CreateRerankerParams): Promise<Reranker> {
    const body: Record<string, unknown> = {
      displayName: params.displayName,
      providerType: params.providerType,
      endpointUrl: params.endpointUrl,
      modelIdentifier: params.modelIdentifier,
    };
    if (params.apiPath !== undefined) body.apiPath = params.apiPath;
    if (params.credentials !== undefined) body.credentials = params.credentials;

    return this.request<Reranker>("POST", "/v1/rerankers", body);
  }

  async listRerankers(): Promise<Reranker[]> {
    const res = await this.request<{ rerankers: Reranker[] }>(
      "GET",
      "/v1/rerankers"
    );
    return res.rerankers ?? [];
  }

  async getReranker(id: string): Promise<Reranker> {
    return this.request<Reranker>("GET", `/v1/rerankers/${id}`);
  }

  async deleteReranker(id: string): Promise<void> {
    await this.request<void>("DELETE", `/v1/rerankers/${id}`);
  }

  // ── OCR ────────────────────────────────────────────────────────────────

  async ocrDocument(params: OcrDocumentParams): Promise<OcrResult> {
    return this.request<OcrResult>("POST", "/v1/ocr:document", {
      content: params.content,
      contentType: params.contentType,
    });
  }

  // ── Batch Get Memories ─────────────────────────────────────────────────

  async batchGetMemories(
    memoryIds: string[]
  ): Promise<Memory[]> {
    const res = await this.request<{ memories: Memory[] }>(
      "POST",
      "/v1/memories:batchGet",
      { memoryIds }
    );
    return res.memories ?? [];
  }
}

/**
 * API client for the Two-Stage Search Orchestrator.
 */

const DEFAULT_BASE_URL = "http://localhost:8080";

export interface SearchRequest {
  user_id?: string;
  user_context?: string;
  query: string;
  top_k_retrieve?: number;
  top_k_final?: number;
}

export interface FinalItem {
  product_id: string;
  retrieval_rank?: number;
  rec_score: number;
  rerank_score: number;
  esci_label?: string;
  is_substitute?: boolean;
  product_text?: string;
}

export interface SearchResponse {
  items: FinalItem[];
  stats: {
    request_id?: string;
    num_candidates?: number;
    num_returned?: number;
    stage_1_stats?: Record<string, unknown>;
    stage_2_stats?: Record<string, unknown>;
    total_latency_ms?: number;
  };
}

export interface Stage1RecommendItem {
  product_id: string;
  score: number;
  product_text?: string;
}

export interface Stage1RecommendResponse {
  recommendations: Stage1RecommendItem[];
  stats?: Record<string, unknown>;
}

export async function search(
  request: SearchRequest,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<SearchResponse> {
  const url = `${baseUrl.replace(/\/$/, "")}/search`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Search failed: ${res.status} - ${text}`);
  }
  return res.json();
}

export async function stage1Recommend(
  request: SearchRequest,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<Stage1RecommendResponse> {
  const url = `${baseUrl.replace(/\/$/, "")}/stage1/recommend`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Stage 1 failed: ${res.status} - ${text}`);
  }
  return res.json();
}

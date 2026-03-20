import { useState } from "react";
import {
  search,
  stage1Recommend,
  type FinalItem,
  type SearchResponse,
  type Stage1RecommendResponse,
} from "./api/searchClient";
import "./App.css";
import { QueryForm } from "./components/QueryForm";
import { ResultsView } from "./components/ResultsView";
import { StatsBar } from "./components/StatsBar";

type ViewMode = "side-by-side" | "diff";

export default function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    stage1: Stage1RecommendResponse;
    final: SearchResponse;
  } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("side-by-side");
  // In production behind Nginx, `/api` is proxied to the FastAPI backend.
  // In local dev, Vite's proxy maps `/api` -> `http://localhost:8080`.
  const [apiUrl] = useState("/api");

  const handleSearch = async (params: {
    user_id?: string;
    user_context?: string;
    query: string;
    top_k_retrieve: number;
    top_k_final: number;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const [stage1, final] = await Promise.all([
        stage1Recommend(params, apiUrl),
        search(params, apiUrl),
      ]);
      setData({ stage1, final });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Two-Stage Search</h1>
        <p className="subtitle">Retrieval → Reranking</p>
      </header>

      <aside className="sidebar">
        <QueryForm onSubmit={handleSearch} loading={loading} />
      </aside>

      <main className="main">
        <div className="view-controls">
          <span>View:</span>
          <button
            className={viewMode === "side-by-side" ? "active" : ""}
            onClick={() => setViewMode("side-by-side")}
          >
            Side-by-side
          </button>
          <button
            className={viewMode === "diff" ? "active" : ""}
            onClick={() => setViewMode("diff")}
          >
            Diff
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {data && (
          <>
            <StatsBar stats={data.final.stats} />
            <div className="purchase-history-echo">
              <h3>Purchase history used</h3>
              <pre>
                {(() => {
                  const v = (data.final.stats as any).purchase_history_used as
                    | string
                    | undefined;
                  return (
                    v ??
                    "No stored purchase history found for the provided User ID. Stage 1 used your query only."
                  );
                })()}
              </pre>
            </div>
            <ResultsView
              stage1Items={data.stage1.recommendations.map<FinalItem>(
                (r, idx) => ({
                  product_id: r.product_id,
                  rec_score: r.score,
                  // Stage 1 has no rerank score; use 0 placeholder
                  rerank_score: 0,
                  product_text: r.product_text,
                  retrieval_rank: idx + 1,
                }),
              )}
              finalItems={data.final.items}
              viewMode={viewMode}
              loading={loading}
            />
          </>
        )}

        {!data && !loading && !error && (
          <div className="empty-state">
            <p>
              Enter a query, and provide either a User ID or purchase history.
            </p>
            <p className="muted">
              Stage 1 retrieval uses your purchase history (or Instacart’s
              stored history for the selected user).
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

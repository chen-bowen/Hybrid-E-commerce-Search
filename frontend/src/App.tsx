import { useState } from "react";
import { QueryForm } from "./components/QueryForm";
import "./App.css";
import { StatsBar } from "./components/StatsBar";
import { ResultsView } from "./components/ResultsView";
import { search, type SearchResponse } from "./api/searchClient";

type ViewMode = "side-by-side" | "diff";

export default function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("side-by-side");
  const [apiUrl, setApiUrl] = useState("http://localhost:8080");

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
      const res = await search(params, apiUrl);
      setData(res);
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
        <p className="subtitle">
          Instacart retrieval → ESCI reranking
        </p>
      </header>

      <aside className="sidebar">
        <QueryForm
          onSubmit={handleSearch}
          loading={loading}
          apiUrl={apiUrl}
          onApiUrlChange={setApiUrl}
        />
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

        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        {data && (
          <>
            <StatsBar stats={data.stats} />
            <ResultsView
              items={data.items}
              viewMode={viewMode}
              loading={loading}
            />
          </>
        )}

        {!data && !loading && !error && (
          <div className="empty-state">
            <p>Enter a query (User ID is optional), then click Search.</p>
            <p className="muted">
              If you leave User ID blank, the backend will use a sample Instacart
              context so you can explore the two-stage pipeline quickly.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

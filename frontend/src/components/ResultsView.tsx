import type { FinalItem } from "../api/searchClient";
import { ResultCard } from "./ResultCard";

type ViewMode = "side-by-side" | "diff";

interface ResultsViewProps {
  items: FinalItem[];
  viewMode: ViewMode;
  loading: boolean;
}

export function ResultsView({ items, viewMode, loading }: ResultsViewProps) {
  // For side-by-side: left = retrieval order (by rec_score), right = rerank order
  const retrievalOrdered = [...items].sort((a, b) => b.rec_score - a.rec_score);
  const rerankOrdered = items;

  if (loading) {
    return (
      <div className="results-loading">
        <div className="spinner" />
        <p>Searching…</p>
      </div>
    );
  }

  if (viewMode === "diff") {
    return (
      <div className="results-diff">
        <h3>Reranked results (with movement)</h3>
        <div className="results-list">
          {rerankOrdered.map((item, i) => (
            <ResultCard
              key={item.product_id}
              item={item}
              rank={i + 1}
              retrievalRank={item.retrieval_rank}
              showMovement
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="results-side-by-side">
      <div className="results-column">
        <h3>Stage 1 – Instacart retrieval</h3>
        <div className="results-list">
          {retrievalOrdered.map((item, i) => (
            <ResultCard
              key={item.product_id}
              item={item}
              rank={i + 1}
              showEsci={false}
              showRerankScore={false}
            />
          ))}
        </div>
      </div>
      <div className="results-column">
        <h3>Stage 2 – ESCI reranked</h3>
        <div className="results-list">
          {rerankOrdered.map((item, i) => (
            <ResultCard
              key={item.product_id}
              item={item}
              rank={i + 1}
              retrievalRank={item.retrieval_rank}
              showMovement
            />
          ))}
        </div>
      </div>
    </div>
  );
}

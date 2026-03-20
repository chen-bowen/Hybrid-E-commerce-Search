import type { FinalItem } from "../api/searchClient";

const ESCI_COLORS: Record<string, string> = {
  E: "var(--e-exact)",
  S: "var(--e-substitute)",
  C: "var(--e-complement)",
  I: "var(--e-irrelevant)",
};

const ESCI_LABELS: Record<string, string> = {
  E: "Exact",
  S: "Substitute",
  C: "Complement",
  I: "Irrelevant",
};

interface ResultCardProps {
  item: FinalItem;
  rank: number;
  retrievalRank?: number;
  showMovement?: boolean;
  showEsci?: boolean;
  showRerankScore?: boolean;
}

export function ResultCard({
  item,
  rank,
  retrievalRank,
  showMovement,
  showEsci = true,
  showRerankScore = true,
}: ResultCardProps) {
  const moved = retrievalRank != null && retrievalRank !== rank;
  const movedUp = moved && retrievalRank > rank;

  return (
    <div className="result-card">
      <div className="card-header">
        <span className="rank">#{rank}</span>
        {showMovement && retrievalRank != null && moved && (
          <span className={`movement ${movedUp ? "up" : "down"}`}>
            was #{retrievalRank}
          </span>
        )}
        {showEsci && (
          <span
            className="esci-badge"
            style={{
              backgroundColor: item.stage_2_label
                ? (ESCI_COLORS[item.stage_2_label] ?? "var(--e-irrelevant)")
                : "transparent",
            }}
            title={
              item.stage_2_label
                ? (ESCI_LABELS[item.stage_2_label] ?? item.stage_2_label)
                : undefined
            }
          >
            {item.stage_2_label ?? "-"}
          </span>
        )}
        {showEsci && item.is_substitute && (
          <span className="substitute-tag">Sub</span>
        )}
      </div>
      <div className="card-body">
        <div className="product-id">{item.product_id}</div>
        <div className="product-text" title={item.product_text ?? ""}>
          {item.product_text ?? "-"}
        </div>
        <div className="scores">
          <span title="Retrieval score">rec: {item.rec_score.toFixed(4)}</span>
          {showRerankScore && (
            <span title="Rerank score">
              rerank: {item.rerank_score.toFixed(4)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

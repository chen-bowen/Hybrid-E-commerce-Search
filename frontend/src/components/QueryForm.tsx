import { useState } from "react";

// Only include user_ids that Stage 1 can actually resolve to stored purchase history.
const SAMPLE_USERS = ["3178496"];
const SAMPLE_QUERIES = [
  "organic whole wheat bread",
  "low fat milk",
  "fresh vegetables",
];

interface QueryFormProps {
  onSubmit: (params: {
    user_id?: string;
    user_context?: string;
    query: string;
    top_k_retrieve: number;
    top_k_final: number;
  }) => void;
  loading: boolean;
}

export function QueryForm({
  onSubmit,
  loading,
}: QueryFormProps) {
  const [userId, setUserId] = useState("");
  const [purchaseHistory, setPurchaseHistory] = useState("");
  const [query, setQuery] = useState("organic whole wheat bread");
  const [topKRetrieve, setTopKRetrieve] = useState(50);
  const [topKFinal, setTopKFinal] = useState(10);

  const canSubmit = userId.trim().length > 0 || purchaseHistory.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUserId = userId.trim();
    const trimmedPurchaseHistory = purchaseHistory.trim();

    onSubmit(
      trimmedUserId
        ? {
            user_id: trimmedUserId,
            query,
            top_k_retrieve: topKRetrieve,
            top_k_final: topKFinal,
          }
        : {
            query,
            top_k_retrieve: topKRetrieve,
            top_k_final: topKFinal,
            ...(trimmedPurchaseHistory
              ? {
                  user_context: trimmedPurchaseHistory,
                }
              : {}),
          },
    );
  };

  const pickRandomUser = () => {
    setUserId(SAMPLE_USERS[Math.floor(Math.random() * SAMPLE_USERS.length)]);
  };

  const pickRandomQuery = () => {
    setQuery(SAMPLE_QUERIES[Math.floor(Math.random() * SAMPLE_QUERIES.length)]);
  };

  return (
    <form className="query-form" onSubmit={handleSubmit}>
      <label>
        User ID (optional)
        <div className="input-row">
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Leave blank if you provide purchase history below"
          />
          <button type="button" onClick={pickRandomUser} title="Random user">
            Random
          </button>
        </div>
      </label>
      <label>
        Purchase history (optional)
        <textarea
          value={purchaseHistory}
          onChange={(e) => setPurchaseHistory(e.target.value)}
          placeholder="[+7d w4h14] Organic Milk, Whole Wheat Bread."
        />
        <div className="muted-text">
          If `User ID` is set, Stage 1 will use Instacart’s stored history for
          that user (purchase history input is ignored).
        </div>
      </label>
      <label>
        Query
        <div className="input-row">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="organic whole wheat bread"
          />
          <button type="button" onClick={pickRandomQuery} title="Random query">
            Random
          </button>
        </div>
      </label>
      <label>
        Retrieve (Stage 1)
        <input
          type="range"
          min={10}
          max={100}
          value={topKRetrieve}
          onChange={(e) => setTopKRetrieve(Number(e.target.value))}
        />
        <span>{topKRetrieve}</span>
      </label>
      <label>
        Final (Stage 2)
        <input
          type="range"
          min={5}
          max={50}
          value={topKFinal}
          onChange={(e) => setTopKFinal(Number(e.target.value))}
        />
        <span>{topKFinal}</span>
      </label>
      <button type="submit" disabled={loading || !canSubmit}>
        {loading ? "Searching…" : "Search"}
      </button>
      {!canSubmit && (
        <div className="muted-text">
          Provide either a `User ID` or purchase history before searching.
        </div>
      )}
    </form>
  );
}

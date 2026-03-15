interface StatsBarProps {
  stats: {
    num_candidates?: number;
    num_returned?: number;
    stage_1_stats?: { total_latency_ms?: number };
    stage_2_stats?: {
      total_latency_ms?: number;
      model_forward_time_ms?: number;
    };
    total_latency_ms?: number;
  };
}

export function StatsBar({ stats }: StatsBarProps) {
  const instacartMs = stats.stage_1_stats?.total_latency_ms;
  const esciMs = stats.stage_2_stats?.total_latency_ms;
  const total = stats.total_latency_ms;

  return (
    <div className="stats-bar">
      <div className="stat">
        <span className="label">Candidates</span>
        <span className="value">{stats.num_candidates ?? "-"}</span>
      </div>
      <div className="stat">
        <span className="label">Returned</span>
        <span className="value">{stats.num_returned ?? "-"}</span>
      </div>
      <div className="stat">
        <span className="label">Stage 1 (Instacart)</span>
        <span className="value">
          {instacartMs != null ? `${instacartMs.toFixed(0)}ms` : "-"}
        </span>
      </div>
      <div className="stat">
        <span className="label">Stage 2 (ESCI)</span>
        <span className="value">
          {esciMs != null ? `${esciMs.toFixed(0)}ms` : "-"}
        </span>
      </div>
      <div className="stat">
        <span className="label">Total</span>
        <span className="value">
          {total != null ? `${total.toFixed(0)}ms` : "-"}
        </span>
      </div>
      {instacartMs != null && esciMs != null && (
        <div className="latency-bar">
          <div
            className="latency-seg instacart"
            style={{
              width: `${(instacartMs / (instacartMs + esciMs)) * 100}%`,
            }}
          />
          <div
            className="latency-seg esci"
            style={{ width: `${(esciMs / (instacartMs + esciMs)) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}

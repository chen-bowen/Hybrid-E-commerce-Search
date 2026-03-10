# Two-Stage Search Orchestrator
# Lightweight FastAPI service that calls Instacart and ESCI backends.
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS builder

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY orchestrator_service/ ./orchestrator_service/
RUN uv sync --frozen --no-dev

# Runtime stage
FROM python:3.12-slim-bookworm AS runtime

WORKDIR /app

COPY --from=builder /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"

COPY orchestrator_service/ ./orchestrator_service/
COPY pyproject.toml ./

EXPOSE 8080

CMD ["uvicorn", "orchestrator_service.main:app", "--host", "0.0.0.0", "--port", "8080"]

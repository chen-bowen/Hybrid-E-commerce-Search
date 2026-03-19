# Hybrid E-Commerce Search (HF Docker Space friendly)
#
# Hugging Face Docker Spaces do NOT run `docker-compose.yml`; they build/run only the root Dockerfile.
# Therefore, the default final stage serves:
#   - React static frontend via nginx on port 7860
#   - FastAPI backend on port 8080, proxied by nginx
#
# For local `docker-compose`, we can build an alternate target (`backend-runtime`) that runs only
# the FastAPI backend (so the `gateway`/`frontend` services keep working).

## 1) Build frontend (React/Vite)
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

## 2) Build backend dependencies (uv)
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS backend-builder
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY backend/ ./backend/
RUN uv sync --frozen --no-dev

## 3) Runtime: backend only (used by local docker-compose)
FROM python:3.12-slim-bookworm AS backend-runtime
WORKDIR /app
COPY --from=backend-builder /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"
COPY backend/ ./backend/
EXPOSE 8080
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]

## 4) Runtime: HF Docker Space (nginx + backend)
FROM python:3.12-slim-bookworm AS runtime
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends nginx ca-certificates git \
  && rm -rf /var/lib/apt/lists/*

COPY --from=backend-builder /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"

# Stage 1 defaults (HF fallback downloads)
ENV MODEL_DIR=chenbowen184/instacart-two-tower-sbert
ENV CORPUS_PATH=/app/processed/p5_mp20_ef0.1/eval_corpus.json
ENV CORPUS_HF_REPO=chenbowen184/product-artifacts
ENV CORPUS_HF_REPO_TYPE=dataset
ENV INFERENCE_DEVICE=cpu

# Stage 2 defaults (if local checkpoint missing/empty, loader will fall back)
ENV MODEL_PATH=/app/checkpoints/multi_task_reranker

# Clone the backend repos and install their dependencies into separate venvs.
# This avoids Python module name collisions: both repos use `src.*`.
COPY scripts/setup_deps.sh ./scripts/setup_deps.sh
RUN chmod +x ./scripts/setup_deps.sh && ./scripts/setup_deps.sh

# Stage 1 venv
RUN python -m venv /venv-stage-1 \
  && /venv-stage-1/bin/pip install --no-cache-dir --upgrade pip \
  && /venv-stage-1/bin/pip install --no-cache-dir "/app/deps/stage-1" \
  && rm -rf /app/deps/stage-1/.git

# Stage 2 venv
RUN python -m venv /venv-stage-2 \
  && /venv-stage-2/bin/pip install --no-cache-dir --upgrade pip \
  && /venv-stage-2/bin/pip install --no-cache-dir "/app/deps/stage-2" \
  && rm -rf /app/deps/stage-2/.git

COPY backend/ ./backend/
COPY --from=frontend-builder /frontend/dist /usr/share/nginx/html

# HF external port.
EXPOSE 7860

COPY gateway/nginx.conf /etc/nginx/conf.d/default.conf

# In a single-container deployment, the nginx config proxies to `orchestrator:8080` and
# (optionally) to `frontend:80`. We map those hostnames to localhost so they work.
CMD ["sh", "-c", "\
  echo '127.0.0.1 orchestrator' >> /etc/hosts && \
  echo '127.0.0.1 frontend' >> /etc/hosts && \
  # Provide a frontend server on :80 in single-container mode so gateway proxy works.
  python -m http.server 80 -d /usr/share/nginx/html & \
  # Ensure HF token is visible to huggingface_hub/transformers inside all processes.
  # Spaces usually provides `HF_TOKEN`; we mirror it to `HUGGINGFACE_HUB_TOKEN`.
  export HUGGINGFACE_HUB_TOKEN=\"${HUGGINGFACE_HUB_TOKEN:-${HF_TOKEN:-}}\" && \
  (cd /app/deps/stage-1 && /venv-stage-1/bin/uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --timeout-graceful-shutdown 30) & \
  (cd /app/deps/stage-2 && /venv-stage-2/bin/uvicorn src.api.main:app --host 0.0.0.0 --port 8001) & \
  uvicorn backend.main:app --host 0.0.0.0 --port 8080 & \
  nginx -g 'daemon off;' \
  "]

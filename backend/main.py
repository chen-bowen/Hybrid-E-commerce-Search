"""
Two-Stage Search Orchestrator API.

Calls Stage 1 (Stage 1 Retrieval) and Stage 2 (ESCI reranker), joins results,
and exposes a single POST /search endpoint.
"""

from __future__ import annotations

import logging
import os
import time
from uuid import uuid4

import httpx
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from backend.schemas import FinalItem, TwoStageRequest, TwoStageResponse

logger = logging.getLogger(__name__)

INSTACART_URL = os.getenv("INSTACART_URL", "http://localhost:8000")
ESCI_URL = os.getenv("ESCI_URL", "http://localhost:8001")
INSTACART_API_KEY = os.getenv("INSTACART_API_KEY", "")
ESCI_API_KEY = os.getenv("ESCI_API_KEY", "")

app = FastAPI(title="Two-Stage Search Orchestrator")

# Allow browser clients (e.g. Vite dev server) to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _build_headers(api_key: str) -> dict[str, str]:
    """Build headers for backend requests, including API key if configured."""
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["X-API-Key"] = api_key
    return headers


async def _call_instacart(payload: dict) -> dict:
    """Call Instacart POST /recommend."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{INSTACART_URL.rstrip('/')}/recommend",
            json=payload,
            headers=_build_headers(INSTACART_API_KEY),
        )
        resp.raise_for_status()
        return resp.json()


async def _call_esci(payload: dict) -> dict:
    """Call ESCI POST /predict."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{ESCI_URL.rstrip('/')}/predict",
            json=payload,
            headers=_build_headers(ESCI_API_KEY),
        )
        resp.raise_for_status()
        return resp.json()


@app.post("/stage1/recommend")
async def stage1_recommend(req: TwoStageRequest) -> dict:
    """
    Proxy endpoint that exposes raw Stage 1 retrieval results.

    This calls Instacart POST /recommend and returns its JSON response directly,
    without running Stage 2 reranking.
    """
    # Apply the same user_id / user_context fallback behavior as /search
    if not req.user_id and not req.user_context:
        req.user_context = "[+7d w4h14] Organic Milk, Whole Wheat Bread."

    instacart_payload: dict = {
        "top_k": req.top_k_retrieve,
    }
    if req.user_id:
        instacart_payload["user_id"] = req.user_id
    else:
        instacart_payload["user_context"] = req.user_context

    instacart_resp = await _call_instacart(instacart_payload)
    return instacart_resp


@app.post("/search", response_model=TwoStageResponse)
async def two_stage_search(req: TwoStageRequest) -> TwoStageResponse:
    """
    Two-stage search: Stage 1 (Retrieval) and Stage 2 (Reranking).\n\n
    Requires: user_id or user_context, plus query.
    """
    # If neither user_id nor user_context is provided (e.g. empty UI field),
    # fall back to a simple synthetic context so the demo UI "just works".
    if not req.user_id and not req.user_context:
        req.user_context = "[+7d w4h14] Organic Milk, Whole Wheat Bread."

    start_time = time.perf_counter()
    request_id = str(uuid4())

    try:
        # Stage 1: Retrieval
        instacart_payload: dict = {
            "top_k": req.top_k_retrieve,
        }
        if req.user_id:
            instacart_payload["user_id"] = req.user_id
        else:
            instacart_payload["user_context"] = req.user_context

        instacart_resp = await _call_instacart(instacart_payload)
        recs = instacart_resp.get("recommendations", [])

        if not recs:
            return TwoStageResponse(
                items=[],
                stats={
                    "request_id": request_id,
                    "num_candidates": 0,
                    "num_returned": 0,
                    "stage_1_stats": instacart_resp.get("stats"),
                    "stage_2_stats": None,
                    "total_latency_ms": (time.perf_counter() - start_time) * 1000,
                },
            )

        # Build candidates for ESCI
        candidates = [{"product_id": r["product_id"], "text": r.get("product_text") or ""} for r in recs]
        rec_map = {r["product_id"]: r for r in recs}

        # Stage 2:Reranking
        esci_payload = {
            "query": req.query,
            "candidates": candidates,
        }
        esci_resp = await _call_esci(esci_payload)
        ranked = esci_resp.get("ranked", [])

        # Sort by rerank score descending so final order is by relevance, not retrieval order
        ranked = sorted(ranked, key=lambda r: r.get("score", float("-inf")), reverse=True)

        # Build retrieval rank map (1-based index in Instacart order)
        retrieval_rank_map = {r["product_id"]: i + 1 for i, r in enumerate(recs)}

        # Apply top_k_final and join metadata
        top_ranked = ranked[: req.top_k_final]
        items: list[FinalItem] = []
        for i, r in enumerate(top_ranked, 1):
            pid = r["product_id"]
            meta = rec_map.get(pid, {})
            items.append(
                FinalItem(
                    product_id=pid,
                    retrieval_rank=retrieval_rank_map.get(pid),
                    rec_score=meta.get("score", 0.0),
                    rerank_score=r.get("score", 0.0),
                    esci_label=r.get("esci_class"),
                    is_substitute=r.get("is_substitute"),
                    product_text=meta.get("product_text"),
                )
            )

        total_ms = (time.perf_counter() - start_time) * 1000
        stats = {
            "request_id": request_id,
            "num_candidates": len(candidates),
            "num_returned": len(items),
            "stage_1_stats": instacart_resp.get("stats"),
            "stage_2_stats": esci_resp.get("stats"),
            "total_latency_ms": round(total_ms, 2),
        }

        logger.info(
            "two_stage_search request_id=%s user_id=%s query=%s candidates=%d final=%d latency_ms=%.0f",
            request_id,
            req.user_id or "(context)",
            req.query[:50],
            len(candidates),
            len(items),
            total_ms,
        )

        return TwoStageResponse(items=items, stats=stats)

    except httpx.HTTPStatusError as e:
        logger.exception("Backend HTTP error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Backend error: {e.response.status_code} - {e.response.text[:200]}",
        ) from e
    except httpx.RequestError as e:
        logger.exception("Backend request error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Backend unreachable: {str(e)}",
        ) from e


@app.get("/health")
async def health() -> dict:
    """Liveness probe."""
    return {"status": "ok"}


@app.get("/", include_in_schema=False)
async def home() -> HTMLResponse:
    """Simple landing page so the Space has a frontend entrypoint."""
    return HTMLResponse(
        """
        <html>
          <head><title>Hybrid E-commerce Search</title></head>
          <body>
            <h2>Hybrid E-commerce Search</h2>
            <p>This Space runs the backend API.</p>
            <ul>
              <li><a href="/docs">API docs</a> (Swagger)</li>
              <li><a href="/redoc">ReDoc</a></li>
              <li><a href="/health">Health</a></li>
            </ul>
          </body>
        </html>
        """.strip()
    )


@app.get("/ready")
async def ready() -> dict:
    """Readiness probe."""
    return {"status": "ready"}

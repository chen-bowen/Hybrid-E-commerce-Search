"""
Pydantic schemas for the Two-Stage Search Orchestrator API.

Request/response models for POST /search endpoint.
"""

from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field


class TwoStageRequest(BaseModel):
    """Request body for POST /search. Provide user_id or user_context, plus query."""

    user_id: Optional[str] = Field(
        default=None,
        description="User identifier resolvable to a stored eval query (order_id) for Instacart retrieval.",
    )
    user_context: Optional[str] = Field(
        default=None,
        max_length=10_000,
        description="Full user context string for Instacart retrieval (e.g. '[+7d w4h14] Organic Milk, Whole Wheat Bread.').",
    )
    query: str = Field(
        ...,
        description="Search query text used for ESCI reranking.",
    )
    top_k_retrieve: int = Field(
        default=50,
        ge=1,
        le=200,
        description="Number of candidates to retrieve from Instacart (Stage 1).",
    )
    top_k_final: int = Field(
        default=10,
        ge=1,
        le=100,
        description="Number of final results to return after ESCI reranking (Stage 2).",
    )


class FinalItem(BaseModel):
    """Single item in the two-stage search response."""

    product_id: str = Field(..., description="Product identifier.")
    retrieval_rank: Optional[int] = Field(
        default=None,
        description="1-based rank in Stage 1 (Instacart) retrieval order.",
    )
    rec_score: float = Field(
        ...,
        description="Retrieval score from Instacart two-tower model (Stage 1).",
    )
    rerank_score: float = Field(
        ...,
        description="Reranking score from ESCI cross-encoder (Stage 2).",
    )
    esci_label: Optional[str] = Field(
        default=None,
        description="Predicted ESCI class: E (Exact), S (Substitute), C (Complement), I (Irrelevant).",
    )
    is_substitute: Optional[bool] = Field(
        default=None,
        description="True if product is a substitute (ESCI=S).",
    )
    product_text: Optional[str] = Field(
        default=None,
        description="Display text (title, aisle, department) from Instacart corpus.",
    )


class TwoStageResponse(BaseModel):
    """Response from POST /search."""

    items: list[FinalItem] = Field(
        ...,
        description="Final ranked items (top_k_final) with joined retrieval and rerank metadata.",
    )
    stats: dict[str, Any] = Field(
        default_factory=dict,
        description="Aggregated stats: num_candidates, num_returned, stage_1_stats, stage_2_stats, etc.",
    )

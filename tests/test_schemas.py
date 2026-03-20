"""Unit tests for backend schemas."""

from backend.schemas import FinalItem, TwoStageRequest, TwoStageResponse


def test_two_stage_request_requires_query() -> None:
    """TwoStageRequest must have query."""
    req = TwoStageRequest(user_id="123", query="bread")
    assert req.query == "bread"
    assert req.user_id == "123"
    assert req.top_k_retrieve == 50
    assert req.top_k_final == 10


def test_two_stage_request_user_context() -> None:
    """TwoStageRequest accepts user_context instead of user_id."""
    req = TwoStageRequest(user_context="[+7d] Milk, Bread.", query="bread")
    assert req.user_context == "[+7d] Milk, Bread."
    assert req.user_id is None


def test_final_item() -> None:
    """FinalItem serializes correctly."""
    item = FinalItem(
        product_id="13517",
        retrieval_rank=1,
        rec_score=0.76,
        rerank_score=0.91,
        stage_2_label="E",
        is_substitute=False,
        product_text="Whole Wheat Bread",
    )
    assert item.product_id == "13517"
    assert item.stage_2_label == "E"


def test_two_stage_response() -> None:
    """TwoStageResponse holds items and stats."""
    resp = TwoStageResponse(
        items=[
            FinalItem(product_id="1", rec_score=0.5, rerank_score=0.8),
        ],
        stats={"num_candidates": 50, "num_returned": 1},
    )
    assert len(resp.items) == 1
    assert resp.items[0].product_id == "1"
    assert resp.stats["num_returned"] == 1

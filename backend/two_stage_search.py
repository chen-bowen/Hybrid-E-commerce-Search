#!/usr/bin/env python3
"""
Smoke script for the two-stage search pipeline.

Sends sample requests to the orchestrator POST /search endpoint and prints
a readable table of results with scores and ESCI labels.

Usage:
    uv run two-stage-search [--url URL] [--user-id ID] [--query QUERY]
    uv run python -m backend.two_stage_search [--url URL] ...

Requires: Orchestrator running at http://localhost:8080 (or --url).
"""

from __future__ import annotations

import argparse
import json
import sys
from typing import Any

import httpx


def main() -> None:
    parser = argparse.ArgumentParser(description="Two-stage search smoke script")
    parser.add_argument(
        "--url",
        default="http://localhost:8080",
        help="Orchestrator base URL",
    )
    parser.add_argument(
        "--user-id",
        default="3178496",
        help="User ID for Stage 1 Retrieval",
    )
    parser.add_argument(
        "--query",
        default="organic whole wheat bread",
        help="Search query for Stage 2 Reranking",
    )
    parser.add_argument(
        "--top-k-retrieve",
        type=int,
        default=20,
        help="Number of candidates to retrieve",
    )
    parser.add_argument(
        "--top-k-final",
        type=int,
        default=10,
        help="Number of final results",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output raw JSON instead of table",
    )
    args = parser.parse_args()

    payload = {
        "user_id": args.user_id,
        "query": args.query,
        "top_k_retrieve": args.top_k_retrieve,
        "top_k_final": args.top_k_final,
    }

    url = f"{args.url.rstrip('/')}/search"
    print(f"POST {url}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    print()

    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(url, json=payload)
            resp.raise_for_status()
            data: dict[str, Any] = resp.json()
    except httpx.HTTPStatusError as e:
        print(f"Error: {e.response.status_code} - {e.response.text[:500]}", file=sys.stderr)
        sys.exit(1)
    except httpx.RequestError as e:
        print(f"Request error: {e}", file=sys.stderr)
        sys.exit(1)

    if args.json:
        print(json.dumps(data, indent=2))
        return

    items = data.get("items", [])
    stats = data.get("stats", {})

    print("Stats:", json.dumps(stats, indent=2))
    print()
    print(f"{'Rank':<6} {'product_id':<12} {'rec_score':<10} {'rerank':<10} {'ESCI':<6} {'Sub':<6}  product_text")
    print("-" * 100)

    for i, item in enumerate(items, 1):
        pid = item.get("product_id", "")
        rec = item.get("rec_score", 0)
        rerank = item.get("rerank_score", 0)
        esci = item.get("esci_label") or "-"
        sub = "Y" if item.get("is_substitute") else "N"
        text = (item.get("product_text") or "")[:60]
        print(f"{i:<6} {pid:<12} {rec:<10.4f} {rerank:<10.4f} {esci:<6} {sub:<6}  {text}")

    print()
    print(f"Returned {len(items)} items.")


if __name__ == "__main__":
    main()

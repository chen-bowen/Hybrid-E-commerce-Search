#!/usr/bin/env bash
# Clone Stage 1 (Instacart) and Stage 2 (ESCI) backend repos into deps/ for Docker builds.
# Run from project root: ./scripts/setup_deps.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPS_DIR="$PROJECT_ROOT/deps"

STAGE_1_REPO="${STAGE_1_REPO:-https://github.com/chen-bowen/instacart_next_order_recommendation.git}"
STAGE_2_REPO="${STAGE_2_REPO:-https://github.com/chen-bowen/Amazon_Multitask_Search_Ranking.git}"

mkdir -p "$DEPS_DIR"
cd "$DEPS_DIR"

if [ -d "stage-1/.git" ]; then
  echo "Updating deps/stage-1..."
  (cd stage-1 && git fetch origin && git remote set-head origin -a 2>/dev/null || true && git reset --hard origin/HEAD)
else
  echo "Cloning Stage 1 (Instacart) repo..."
  git clone "$STAGE_1_REPO" stage-1
fi

if [ -d "stage-2/.git" ]; then
  echo "Updating deps/stage-2..."
  (cd stage-2 && git fetch origin && git remote set-head origin -a 2>/dev/null || true && git reset --hard origin/HEAD)
else
  echo "Cloning Stage 2 (ESCI) repo..."
  git clone "$STAGE_2_REPO" stage-2
fi

echo ""
echo "Done. Backend repos are in deps/stage-1 and deps/stage-2."
echo "You must have trained models and data in those repos (see their READMEs)."
echo "Then run: docker compose up --build"

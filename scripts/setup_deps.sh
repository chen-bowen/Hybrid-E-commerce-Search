#!/usr/bin/env bash
# Clone Instacart and ESCI backend repos into deps/ for Docker builds.
# Run from project root: ./scripts/setup_deps.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPS_DIR="$PROJECT_ROOT/deps"

INSTACART_REPO="${INSTACART_REPO:-https://github.com/chen-bowen/instacart_next_order_recommendation.git}"
ESCI_REPO="${ESCI_REPO:-https://github.com/chen-bowen/Amazon_Multitask_Search_Ranking.git}"

mkdir -p "$DEPS_DIR"
cd "$DEPS_DIR"

if [ -d "instacart/.git" ]; then
  echo "deps/instacart already exists, skipping clone"
else
  echo "Cloning Instacart repo..."
  git clone "$INSTACART_REPO" instacart
fi

if [ -d "esci/.git" ]; then
  echo "deps/esci already exists, skipping clone"
else
  echo "Cloning ESCI repo..."
  git clone "$ESCI_REPO" esci
fi

echo ""
echo "Done. Backend repos are in deps/instacart and deps/esci."
echo "You must have trained models and data in those repos (see their READMEs)."
echo "Then run: docker compose up --build"

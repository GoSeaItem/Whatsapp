#!/usr/bin/env bash
set -euo pipefail

ROLLBACK_REF="${1:-}"

if [[ -z "$ROLLBACK_REF" ]]; then
  echo "Usage: $0 <git-tag-or-commit>" >&2
  exit 1
fi

git fetch --all --tags
git checkout "$ROLLBACK_REF"
ENV_FILE="${ENV_FILE:-.env.production}" ./scripts/deploy.sh

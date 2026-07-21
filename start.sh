#!/bin/bash
set -e
cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  echo "Installation des dépendances..."
  npm install --production
fi

if command -v npx >/dev/null 2>&1; then
  exec npx ts-node --transpile-only index.js
fi

exec node index.js

#!/bin/bash
set -e
cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  echo "Installation des dépendances..."
  npm install --omit=dev
fi

exec node index.js

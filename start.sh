#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$ROOT_DIR/prototipo"

if [[ ! -f "$APP_DIR/package.json" ]]; then
  echo "No se encontró el proyecto en $APP_DIR" >&2
  exit 1
fi

if [[ ! -d "$APP_DIR/node_modules" ]]; then
  echo "Instalando dependencias en prototipo..."
  (cd "$APP_DIR" && npm install)
fi

echo "Iniciando el prototipo en http://127.0.0.1:5173/"
cd "$APP_DIR"
npm run dev -- --host 127.0.0.1

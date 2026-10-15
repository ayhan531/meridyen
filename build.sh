#!/usr/bin/env bash
# Render "Web Service" derlemesi: API + web tek serviste.
set -euo pipefail
npm --prefix apps/api ci --include=dev
npm --prefix apps/api run build
npm --prefix apps/web ci --include=dev
npm --prefix apps/web run build

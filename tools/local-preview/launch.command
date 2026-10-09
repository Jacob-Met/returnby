#!/bin/zsh
set -eu
APP_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"
exec @@PYTHON@@ -B "$APP_DIR/serve.py" "$@"

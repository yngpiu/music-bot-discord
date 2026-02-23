#!/bin/sh
set -e

# Install Playwright Chromium at startup if not already installed
if [ ! -d "$PLAYWRIGHT_BROWSERS_PATH" ] || [ -z "$(ls -A $PLAYWRIGHT_BROWSERS_PATH 2>/dev/null)" ]; then
  echo "==> Installing Playwright Chromium browser..."
  npx playwright install --with-deps chromium
  echo "==> Playwright install complete."
fi

# Run the application
exec "$@"

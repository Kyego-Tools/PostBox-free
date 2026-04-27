#!/bin/sh
set -e

# ─────────────────────────────────────────────
#  1. First-run Convex setup (deploys backend,
#     generates keys, sets platform creds)
#     Skips automatically on subsequent runs.
# ─────────────────────────────────────────────

if [ -f ./docker-setup.sh ]; then
  sh ./docker-setup.sh
fi

# ─────────────────────────────────────────────
#  2. Runtime environment injection
#     Replaces placeholder values in the built JS
#     so a single Docker image works for any Convex project
# ─────────────────────────────────────────────

inject_env() {
  local placeholder="$1" value="$2" label="$3"
  if [ -n "$value" ] && [ "$value" != "$placeholder" ]; then
    echo "  Injecting $label..."
    find /app/.next -name '*.js' -exec sed -i "s|${placeholder}|${value}|g" {} + 2>/dev/null || true
  fi
}

# Only inject if placeholders were used at build time
if grep -rq "__PLACEHOLDER__" /app/.next/ 2>/dev/null; then
  echo "Injecting runtime environment variables..."

  if [ -z "$NEXT_PUBLIC_CONVEX_URL" ]; then
    echo "ERROR: NEXT_PUBLIC_CONVEX_URL is required"
    echo "Set it in your .env or docker-compose.yml"
    exit 1
  fi

  inject_env "https://__PLACEHOLDER__.convex.cloud" "$NEXT_PUBLIC_CONVEX_URL"      "CONVEX_URL"
  inject_env "https://__PLACEHOLDER__.convex.site"  "$NEXT_PUBLIC_CONVEX_SITE_URL" "CONVEX_SITE_URL"

  echo "Done."
fi

# ─────────────────────────────────────────────
#  3. Start the app
# ─────────────────────────────────────────────

exec "$@"

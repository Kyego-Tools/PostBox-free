#!/bin/sh
set -e

# ─────────────────────────────────────────────────────────
#  Convex setup (runs inside Docker container on startup)
#
#  Uses a version-stamped marker to know what needs doing:
#    • NEW IMAGE (rebuild) → re-deploy Convex functions
#    • FIRST EVER RUN      → also generate keys + push creds
# ─────────────────────────────────────────────────────────

DATA_DIR="/app/.convex-setup-data"
MARKER_FILE="$DATA_DIR/.setup-done"
VERSION_FILE="$DATA_DIR/.deployed-version"
SETUP_DIR="/app/setup-workspace"
ENV_FILE="/tmp/.convex-env-setup"

# Build version = hash of convex/ directory contents (baked into image)
CURRENT_VERSION=$(find /app/setup-deps/convex -type f -exec md5sum {} + 2>/dev/null | sort | md5sum | cut -d' ' -f1)

IS_FIRST_RUN=true
NEEDS_DEPLOY=true

if [ -f "$MARKER_FILE" ]; then
  IS_FIRST_RUN=false
fi

if [ -f "$VERSION_FILE" ] && [ "$(cat "$VERSION_FILE")" = "$CURRENT_VERSION" ]; then
  NEEDS_DEPLOY=false
fi

# Nothing to do — already configured and code hasn't changed
if [ "$IS_FIRST_RUN" = false ] && [ "$NEEDS_DEPLOY" = false ]; then
  return 0 2>/dev/null || exit 0
fi

# ── Helpers ──

log()  { echo "  ✓ $1"; }
warn() { echo "  ⚠ $1"; }
err()  { echo "  ✗ $1" >&2; }

# ── Pre-flight checks ──

if [ -z "$CONVEX_DEPLOY_KEY" ]; then
  if [ "$IS_FIRST_RUN" = true ]; then
    warn "CONVEX_DEPLOY_KEY not set — skipping automated Convex setup."
    warn "You'll need to deploy functions and set env vars manually."
    warn "Get a deploy key from: Convex Dashboard → Settings → Deploy Keys"
  fi
  return 0 2>/dev/null || exit 0
fi

if [ -z "$NEXT_PUBLIC_CONVEX_URL" ]; then
  err "NEXT_PUBLIC_CONVEX_URL is required."
  exit 1
fi

# Derive CONVEX_SITE_URL from the cloud URL if not explicitly set
if [ -z "$NEXT_PUBLIC_CONVEX_SITE_URL" ]; then
  NEXT_PUBLIC_CONVEX_SITE_URL=$(echo "$NEXT_PUBLIC_CONVEX_URL" | sed 's/\.convex\.cloud/.convex.site/')
fi

# ── Prepare workspace ──

mkdir -p "$SETUP_DIR" "$DATA_DIR"
cp -r /app/setup-deps/node_modules "$SETUP_DIR/"
cp -r /app/setup-deps/convex "$SETUP_DIR/"
cp /app/setup-deps/package.json "$SETUP_DIR/"

if [ "$IS_FIRST_RUN" = true ]; then
  echo ""
  echo "╔══════════════════════════════════════════════╗"
  echo "║   PostBox — First Run Setup   ║"
  echo "╚══════════════════════════════════════════════╝"
  echo ""
fi

# ── Deploy Convex functions ──

if [ "$NEEDS_DEPLOY" = true ]; then
  if [ "$IS_FIRST_RUN" = true ]; then
    echo "Step 1/3: Deploying Convex backend functions..."
  else
    echo "Deploying updated Convex backend functions..."
  fi

  cd "$SETUP_DIR"
  CONVEX_DEPLOY_KEY="$CONVEX_DEPLOY_KEY" npx convex deploy --cmd 'echo "skip"' 2>&1 | tail -5
  log "Backend functions deployed"

  # Record deployed version
  echo "$CURRENT_VERSION" > "$VERSION_FILE"
fi

# ── First run only: generate keys + set credentials ──

if [ "$IS_FIRST_RUN" = true ]; then

  # Step 2: Generate auth + encryption keys and write to .env file
  echo ""
  echo "Step 2/3: Generating authentication keys..."

  node /app/setup-deps/generate-keys.mjs "$ENV_FILE"

  # Append app URL (CONVEX_SITE_URL is managed by Convex automatically)
  echo "APP_URL=$APP_URL" >> "$ENV_FILE"

  echo "SITE_URL=${APP_URL}" >> "$ENV_FILE"


  # Step 3: Append platform credentials (if provided)
  echo ""
  echo "Step 3/3: Configuring platform credentials..."

  PLATFORMS_SET=0

  if [ -n "$FACEBOOK_APP_ID" ] && [ -n "$FACEBOOK_APP_SECRET" ]; then
    echo "FACEBOOK_APP_ID=$FACEBOOK_APP_ID" >> "$ENV_FILE"
    echo "FACEBOOK_APP_SECRET=$FACEBOOK_APP_SECRET" >> "$ENV_FILE"
    PLATFORMS_SET=$((PLATFORMS_SET + 1))
  fi

  if [ -n "$INSTAGRAM_APP_ID" ] && [ -n "$INSTAGRAM_APP_SECRET" ]; then
    echo "INSTAGRAM_APP_ID=$INSTAGRAM_APP_ID" >> "$ENV_FILE"
    echo "INSTAGRAM_APP_SECRET=$INSTAGRAM_APP_SECRET" >> "$ENV_FILE"
    PLATFORMS_SET=$((PLATFORMS_SET + 1))
  fi

  if [ -n "$TIKTOK_CLIENT_KEY" ] && [ -n "$TIKTOK_CLIENT_SECRET" ]; then
    echo "TIKTOK_CLIENT_KEY=$TIKTOK_CLIENT_KEY" >> "$ENV_FILE"
    echo "TIKTOK_CLIENT_SECRET=$TIKTOK_CLIENT_SECRET" >> "$ENV_FILE"
    PLATFORMS_SET=$((PLATFORMS_SET + 1))
  fi

  if [ -n "$TWITTER_CLIENT_ID" ] && [ -n "$TWITTER_CLIENT_SECRET" ]; then
    echo "TWITTER_CLIENT_ID=$TWITTER_CLIENT_ID" >> "$ENV_FILE"
    echo "TWITTER_CLIENT_SECRET=$TWITTER_CLIENT_SECRET" >> "$ENV_FILE"
    PLATFORMS_SET=$((PLATFORMS_SET + 1))
  fi

  if [ -n "$THREADS_APP_ID" ] && [ -n "$THREADS_APP_SECRET" ]; then
    echo "THREADS_APP_ID=$THREADS_APP_ID" >> "$ENV_FILE"
    echo "THREADS_APP_SECRET=$THREADS_APP_SECRET" >> "$ENV_FILE"
    PLATFORMS_SET=$((PLATFORMS_SET + 1))
  fi

  if [ "$PLATFORMS_SET" -eq 0 ]; then
    warn "No platform credentials provided — add them to .env later."
  else
    log "$PLATFORMS_SET platform(s) configured"
  fi

  # Push all env vars to Convex in one batch
  echo ""
  echo "  Pushing environment variables to Convex..."
  cd "$SETUP_DIR"
  CONVEX_DEPLOY_KEY="$CONVEX_DEPLOY_KEY" npx convex env set --from-file "$ENV_FILE" --force 2>&1 | tail -5
  log "All environment variables set"

  # Cleanup temp file
  rm -f "$ENV_FILE"

  # Mark first-run as done
  touch "$MARKER_FILE"

  echo ""
  echo "╔══════════════════════════════════════════════╗"
  echo "║          Setup complete!                      ║"
  echo "║   App starting at http://localhost:3000        ║"
  echo "╚══════════════════════════════════════════════╝"
  echo ""
fi

# ── Cleanup workspace ──

rm -rf "$SETUP_DIR" 2>/dev/null || true

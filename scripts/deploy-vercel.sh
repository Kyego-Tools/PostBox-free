#!/usr/bin/env bash
set -e

# ─────────────────────────────────────────────
#  PostBox — Deploy to Vercel
#
#  Fully automated. No prompts. No GitHub.
#  Fill in .env, run this script, get a live URL.
#
#  Usage:
#    bash deploy-vercel.sh           # First deploy
#    bash deploy-vercel.sh --update  # Update existing deployment
# ─────────────────────────────────────────────

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
DIM='\033[2m'
NC='\033[0m'

log()     { echo -e "${CYAN}ℹ ${NC} $1"; }
success() { echo -e "${GREEN}✓ ${NC} $1"; }
warn()    { echo -e "${YELLOW}⚠ ${NC} $1"; }
err()     { echo -e "${RED}✗ ${NC} $1"; }

ENV_FILE=".env"
CONVEX_ENV_FILE=""

# ─── Load .env ───

if [ ! -f "$ENV_FILE" ]; then
  err "Missing $ENV_FILE"
  echo ""
  echo "  Copy the example and fill in your values:"
  echo -e "  ${CYAN}cp .env.example .env${NC}"
  echo ""
  exit 1
fi

# Parse the env file line by line (handles special chars like | in deploy keys)
while IFS= read -r line || [ -n "$line" ]; do
  # Skip empty lines and comments
  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
  # Extract key=value (only split on first =)
  key="${line%%=*}"
  value="${line#*=}"
  # Trim whitespace from key
  key="$(echo "$key" | xargs)"
  # Skip if no key
  [ -z "$key" ] && continue
  # Export the variable
  export "$key=$value"
done < "$ENV_FILE"

# ─── Validate required vars ───

MISSING=0
check_required() {
  local name="$1"
  eval "local val=\$$name"
  if [ -z "$val" ]; then
    err "Missing required: $name"
    MISSING=1
  fi
}

check_required "VERCEL_TOKEN"
check_required "CONVEX_DEPLOY_KEY"
check_required "NEXT_PUBLIC_CONVEX_URL"

if [ "$MISSING" -eq 1 ]; then
  echo ""
  echo "  Fill in the required values in $ENV_FILE and try again."
  exit 1
fi

# Derive site URL if not set
if [ -z "$NEXT_PUBLIC_CONVEX_SITE_URL" ]; then
  NEXT_PUBLIC_CONVEX_SITE_URL=$(echo "$NEXT_PUBLIC_CONVEX_URL" | sed 's/\.convex\.cloud/.convex.site/')
fi

# ─── Helpers ───

# Get stable production URL from a deployment URL
# vercel --prod outputs deployment-specific URLs (with hash), but we want the stable alias
get_prod_url() {
  local deploy_url="$1"
  local prod_url=""

  # Method 1: Get aliases from vercel inspect
  prod_url=$(npx vercel inspect "$deploy_url" --token "$VERCEL_TOKEN" 2>&1 \
    | grep -oE '[a-zA-Z0-9_.-]+\.vercel\.app' \
    | awk '{ print length, $0 }' | sort -n | head -1 | awk '{print $2}' || true)

  if [ -n "$prod_url" ]; then
    echo "https://$prod_url"
  else
    # Fallback to the deployment URL
    echo "$deploy_url"
  fi
}

# Set env var on Vercel (piped to avoid shell escaping)
vercel_env_set() {
  local name="$1" value="$2"
  if [ -z "$value" ]; then return; fi
  # Try to add first, if it exists, update it
  echo "$value" | npx vercel env add "$name" production --force --token "$VERCEL_TOKEN" 2>/dev/null \
    && success "  Vercel: $name" \
    || warn "  Vercel: could not set $name"
}

# ─── Prerequisites ───

# Node.js
if ! command -v node >/dev/null 2>&1; then
  err "Node.js is not installed."
  echo ""
  echo "  Install Node.js 18+:"
  echo -e "  ${CYAN}• Mac:${NC}     brew install node"
  echo -e "  ${CYAN}• Windows:${NC} https://nodejs.org (LTS version)"
  echo -e "  ${CYAN}• Linux:${NC}   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  err "Node.js 18+ is required. You have $(node -v)."
  echo "  Update at: https://nodejs.org"
  exit 1
fi

# npx
if ! command -v npx >/dev/null 2>&1; then
  err "npx is not available (should come with Node.js)."
  echo "  Try reinstalling Node.js from https://nodejs.org"
  exit 1
fi

# git (optional but recommended)
if ! command -v git >/dev/null 2>&1; then
  warn "git not found — updates (--update) won't pull latest code."
fi

# ─── Banner ───

echo ""
echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}${BOLD}║   PostBox — Vercel Deploy     ║${NC}"
echo -e "${CYAN}${BOLD}║   Fully automated • No GitHub needed         ║${NC}"
echo -e "${CYAN}${BOLD}╚══════════════════════════════════════════════╝${NC}"
echo ""
success "Node.js $(node -v)"

# ─── Update flow ───

if [ "$1" = "--update" ]; then
  log "Updating existing deployment..."
  echo ""

  # Pull latest code
  if command -v git >/dev/null 2>&1 && [ -d ".git" ]; then
    log "Pulling latest code..."
    git pull 2>&1 | tail -3
    success "Code updated"
  fi

  # Re-deploy Convex functions
  log "Deploying Convex backend functions..."
  CONVEX_DEPLOY_KEY="$CONVEX_DEPLOY_KEY" npx convex deploy --cmd 'echo "skip"' 2>&1 | tail -3
  success "Backend functions deployed"

  # Re-deploy to Vercel
  log "Deploying to Vercel..."
  DEPLOY_URL=$(npx vercel --prod --yes --token "$VERCEL_TOKEN" \
    --build-env NEXT_PUBLIC_CONVEX_URL="$NEXT_PUBLIC_CONVEX_URL" \
    --build-env NEXT_PUBLIC_CONVEX_SITE_URL="$NEXT_PUBLIC_CONVEX_SITE_URL" \
    2>/dev/null)

  # Resolve stable production URL
  PROD_URL=$(get_prod_url "$DEPLOY_URL")
  success "Deployed!"

  echo ""
  echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}${BOLD}║   ✓  Update complete!                        ║${NC}"
  echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "  Live at: ${CYAN}${BOLD}$PROD_URL${NC}"
  echo ""
  exit 0
fi

# ─── Full deploy flow ───

# ─── Step 1: Install dependencies ───

echo -e "${BOLD}Step 1/5:${NC} Installing dependencies..."
npm install --silent 2>&1 | tail -3
success "Dependencies installed"

# ─── Step 2: Generate auth keys + push all env vars to Convex ───

echo ""
echo -e "${BOLD}Step 2/5:${NC} Setting up Convex backend..."

CONVEX_ENV_FILE=$(mktemp)

# Generate JWT + encryption keys
node scripts/generate-keys.mjs "$CONVEX_ENV_FILE"

# Append APP_URL placeholder (updated after Vercel deploy)
echo "APP_URL=https://pending-deploy.vercel.app" >> "$CONVEX_ENV_FILE"

# Append platform credentials from .env (if provided)
PLATFORMS=0
for pair in \
  "FACEBOOK_APP_ID:FACEBOOK_APP_SECRET" \
  "INSTAGRAM_APP_ID:INSTAGRAM_APP_SECRET" \
  "TIKTOK_CLIENT_KEY:TIKTOK_CLIENT_SECRET" \
  "TWITTER_CLIENT_ID:TWITTER_CLIENT_SECRET" \
  "THREADS_APP_ID:THREADS_APP_SECRET"; do

  ID_VAR="${pair%%:*}"
  SECRET_VAR="${pair##*:}"
  eval "ID_VAL=\$$ID_VAR"
  eval "SECRET_VAL=\$$SECRET_VAR"

  if [ -n "$ID_VAL" ] && [ -n "$SECRET_VAL" ]; then
    echo "${ID_VAR}=${ID_VAL}" >> "$CONVEX_ENV_FILE"
    echo "${SECRET_VAR}=${SECRET_VAL}" >> "$CONVEX_ENV_FILE"
    PLATFORMS=$((PLATFORMS + 1))
  fi
done

if [ "$PLATFORMS" -gt 0 ]; then
  success "$PLATFORMS platform(s) will be configured"
else
  warn "No platform credentials provided — add them to .env later"
fi

# Push everything to Convex in one batch
log "Pushing environment variables to Convex..."
CONVEX_DEPLOY_KEY="$CONVEX_DEPLOY_KEY" npx convex env set --from-file "$CONVEX_ENV_FILE" --force 2>&1 | tail -3
success "Convex environment configured"

rm -f "$CONVEX_ENV_FILE"

# ─── Step 3: Deploy Convex functions ───

echo ""
echo -e "${BOLD}Step 3/5:${NC} Deploying Convex backend functions..."
CONVEX_DEPLOY_KEY="$CONVEX_DEPLOY_KEY" npx convex deploy --cmd 'echo "skip"' 2>&1 | tail -3
success "Backend functions deployed"

# ─── Step 4: Set Vercel env vars + deploy ───

echo ""
echo -e "${BOLD}Step 4/5:${NC} Deploying to Vercel..."

# Deploy to Vercel with build-time env vars passed inline.
# (vercel env add needs an existing project, but this IS the first deploy that creates it)
log "Building and deploying (this may take a few minutes)..."
DEPLOY_URL=$(npx vercel --prod --yes --token "$VERCEL_TOKEN" \
  --build-env NEXT_PUBLIC_CONVEX_URL="$NEXT_PUBLIC_CONVEX_URL" \
  --build-env NEXT_PUBLIC_CONVEX_SITE_URL="$NEXT_PUBLIC_CONVEX_SITE_URL" \
  2>/dev/null)

if [ -z "$DEPLOY_URL" ]; then
  err "Vercel deployment failed."
  echo "  Try running manually:"
  echo "  npx vercel --prod --yes --build-env NEXT_PUBLIC_CONVEX_URL=$NEXT_PUBLIC_CONVEX_URL"
  exit 1
fi

# Resolve stable production URL (not deployment-specific hash URL)
log "Resolving stable production URL..."
PROD_URL=$(get_prod_url "$DEPLOY_URL")
success "Deployed to Vercel: $PROD_URL"

# ─── Step 5: Finalize ───

echo ""
echo -e "${BOLD}Step 5/5:${NC} Finalizing..."

# Now that the project exists, persist env vars for future deploys (redeploys, --update)
vercel_env_set "NEXT_PUBLIC_CONVEX_URL" "$NEXT_PUBLIC_CONVEX_URL"
vercel_env_set "NEXT_PUBLIC_CONVEX_SITE_URL" "$NEXT_PUBLIC_CONVEX_SITE_URL"

# Update APP_URL on Convex with the stable production URL
CONVEX_DEPLOY_KEY="$CONVEX_DEPLOY_KEY" npx convex env set APP_URL "$PROD_URL" --force 2>/dev/null || true
success "APP_URL set to $PROD_URL"

# ─── Done ───

echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║   ✓  Deployment complete!                    ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}Your app is live at:${NC}"
echo -e "  ${CYAN}${BOLD}$PROD_URL${NC}"
echo ""
echo -e "  ${BOLD}Update to latest version:${NC}"
echo -e "  ${CYAN}bash deploy-vercel.sh --update${NC}"
echo ""
echo -e "  ${BOLD}Add platforms later:${NC}"
echo -e "  Add credentials to .env and re-run this script."
echo ""
echo -e "  ${BOLD}Custom domain:${NC}"
echo -e "  ${CYAN}npx vercel domains add your-domain.com --token \$VERCEL_TOKEN${NC}"
echo -e "  Then update Convex: ${CYAN}npx convex env set APP_URL https://your-domain.com${NC}"
echo ""

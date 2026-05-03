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
ENV_FIRST_LINE=1
while IFS= read -r line || [ -n "$line" ]; do
  # Strip UTF-8 BOM from the very first line (some Windows editors add one)
  if [ "$ENV_FIRST_LINE" -eq 1 ]; then
    line="${line#$'\xef\xbb\xbf'}"
    ENV_FIRST_LINE=0
  fi
  # Strip Windows CRLF carriage return — without this, every value gets a
  # trailing \r baked in and tokens like CONVEX_DEPLOY_KEY get rejected.
  line="${line%$'\r'}"
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

# Sanitize a string into a valid Vercel project name.
# Vercel rules: ≤100 chars, lowercase, only [a-z0-9._-], no '---' run.
sanitize_project_name() {
  local raw="$1"
  echo "$raw" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9._-]+/-/g' \
    | sed -E 's/-{2,}/-/g' \
    | sed -E 's/^[-._]+|[-._]+$//g' \
    | cut -c1-100
}

# Resolve the Vercel project name once so first-deploy and --update agree.
if [ -n "$VERCEL_PROJECT_NAME" ]; then
  VERCEL_PROJECT_NAME=$(sanitize_project_name "$VERCEL_PROJECT_NAME")
else
  VERCEL_PROJECT_NAME=$(sanitize_project_name "$(basename "$PWD")")
fi
# Final guard — if sanitization wiped everything, fall back to a safe default
if [ -z "$VERCEL_PROJECT_NAME" ]; then
  VERCEL_PROJECT_NAME="postbox-app"
fi

# Link the current directory to the Vercel project (creates it if missing).
# Doing this explicitly avoids Vercel's auto-detection picking a name that
# violates its naming rules (e.g. when the parent directory has spaces).
#
# We treat the presence of `.vercel/project.json` as success. Recent Vercel
# CLI versions try to auto-attach a GitHub remote *after* linking, which can
# fail with a non-zero exit if the account has no GitHub login-connection —
# but the actual link is already complete by then, so it's safe to ignore.
link_vercel_project() {
  if [ -f ".vercel/project.json" ]; then
    return
  fi

  local link_log
  link_log=$(mktemp)

  log "Linking project to Vercel as: ${BOLD}$VERCEL_PROJECT_NAME${NC}"
  echo ""
  echo -e "${DIM}── vercel link output ──${NC}"

  # CI=1 + </dev/null suppress new interactive nags from the Vercel CLI
  # (e.g. the "install Claude Code plugin?" prompt that ignores --yes).
  set +e
  CI=1 npx vercel link --yes --project "$VERCEL_PROJECT_NAME" \
    --token "$VERCEL_TOKEN" </dev/null 2>&1 | tee "$link_log"
  local exit_code=${PIPESTATUS[0]}
  set -e

  echo -e "${DIM}────────────────────────${NC}"
  echo ""

  if [ -f ".vercel/project.json" ]; then
    if [ "$exit_code" -ne 0 ]; then
      warn "Vercel CLI returned exit $exit_code, but the project was linked successfully."
      warn "(Likely a non-fatal GitHub auto-connect step — safe to ignore.)"
    fi
    rm -f "$link_log"
    return
  fi

  err "Vercel link failed (exit code $exit_code)."
  echo ""
  echo "  Common causes:"
  echo -e "  ${CYAN}• Project name conflict${NC} — '${BOLD}$VERCEL_PROJECT_NAME${NC}' is taken in your account/team."
  echo "    Set a unique name in .env:"
  echo -e "    ${CYAN}VERCEL_PROJECT_NAME=my-postbox-app${NC}"
  echo -e "  ${CYAN}• Invalid VERCEL_TOKEN${NC} — generate a new one at https://vercel.com/account/tokens"
  echo ""
  echo -e "  Full output saved to: ${CYAN}$link_log${NC}"
  exit 1
}

# Get stable production URL from a deployment URL
# vercel --prod outputs deployment-specific URLs (with hash), but we want the stable alias
get_prod_url() {
  local deploy_url="$1"
  local prod_url=""
  local inspect_out

  # Method 1: Get aliases from vercel inspect
  set +e
  inspect_out=$(CI=1 npx vercel inspect "$deploy_url" --token "$VERCEL_TOKEN" </dev/null 2>&1)
  set -e

  prod_url=$(echo "$inspect_out" \
    | grep -oE '[a-zA-Z0-9_.-]+\.vercel\.app' \
    | awk '{ print length, $0 }' | sort -n | head -1 | awk '{print $2}' || true)

  if [ -n "$prod_url" ]; then
    echo "https://$prod_url"
  else
    warn "Could not resolve stable production URL via 'vercel inspect'." >&2
    echo "${DIM}── vercel inspect output ──${NC}" >&2
    echo "$inspect_out" | sed 's/^/  /' >&2
    echo "${DIM}───────────────────────────${NC}" >&2
    # Fallback to the deployment URL
    echo "$deploy_url"
  fi
}

# Run `vercel --prod` with live streaming output and robust error reporting.
# Sets the global $DEPLOY_URL on success; exits the script on failure.
run_vercel_deploy() {
  local deploy_log
  deploy_log=$(mktemp)

  echo ""
  echo -e "${DIM}── vercel CLI output ──${NC}"

  # Tee to both the user's terminal and the log file. Disable errexit while the
  # pipeline runs so we can inspect the real exit code from PIPESTATUS.
  # CI=1 + </dev/null block any interactive prompts the CLI may slip in.
  set +e
  CI=1 npx vercel --prod --yes --token "$VERCEL_TOKEN" \
    --build-env NEXT_PUBLIC_CONVEX_URL="$NEXT_PUBLIC_CONVEX_URL" \
    --build-env NEXT_PUBLIC_CONVEX_SITE_URL="$NEXT_PUBLIC_CONVEX_SITE_URL" \
    </dev/null 2>&1 | tee "$deploy_log"
  local exit_code=${PIPESTATUS[0]}
  set -e

  echo -e "${DIM}───────────────────────${NC}"
  echo ""

  # Strip ANSI color codes before grepping for the URL
  DEPLOY_URL=$(sed -E 's/\x1b\[[0-9;]*[mK]//g' "$deploy_log" \
    | grep -oE 'https://[a-zA-Z0-9.-]+\.vercel\.app' \
    | tail -1)

  if [ "$exit_code" -ne 0 ] || [ -z "$DEPLOY_URL" ]; then
    err "Vercel deployment failed (exit code $exit_code)."
    echo ""
    echo "  Common causes:"
    echo -e "  ${CYAN}• Invalid VERCEL_TOKEN${NC} — generate a new one at https://vercel.com/account/tokens"
    echo -e "  ${CYAN}• Wrong team scope${NC} — if the token belongs to a team, you may need to pass --scope <team-slug>"
    echo -e "  ${CYAN}• Build error${NC} — see the vercel CLI output above for the actual failure"
    echo ""
    echo -e "  Full output saved to: ${CYAN}$deploy_log${NC}"
    echo "  Try running manually:"
    echo "    npx vercel --prod --yes --token \"\$VERCEL_TOKEN\" \\"
    echo "      --build-env NEXT_PUBLIC_CONVEX_URL=$NEXT_PUBLIC_CONVEX_URL"
    exit 1
  fi

  rm -f "$deploy_log"
}

# Set env var on Vercel (piped to avoid shell escaping)
vercel_env_set() {
  local name="$1" value="$2"
  if [ -z "$value" ]; then return; fi
  # Try to add first, if it exists, update it
  echo "$value" | CI=1 npx vercel env add "$name" production --force --token "$VERCEL_TOKEN" 2>/dev/null \
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
  link_vercel_project
  run_vercel_deploy

  # Resolve stable production URL
  PROD_URL=$(get_prod_url "$DEPLOY_URL")
  success "Deployed: $DEPLOY_URL"

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
# Link first with an explicit, sanitized project name so Vercel doesn't try
# to derive one from the cwd path (which can produce '---' names on macOS
# folders that contain spaces, etc).
link_vercel_project

log "Building and deploying (this may take a few minutes)..."
run_vercel_deploy
success "Deployment URL: $DEPLOY_URL"

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

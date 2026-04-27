#!/usr/bin/env bash
set -e

# ─────────────────────────────────────────────
#  PostBox — Setup Wizard
#  One-time setup to get your scheduler running.
#  Usage: bash setup.sh
# ─────────────────────────────────────────────

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
DIM='\033[2m'
NC='\033[0m'

banner() {
  echo ""
  echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}${BOLD}║   PostBox — Setup         ║${NC}"
  echo -e "${CYAN}${BOLD}║   Self-hosted • Open Source               ║${NC}"
  echo -e "${CYAN}${BOLD}╚══════════════════════════════════════════╝${NC}"
  echo ""
}

info()    { echo -e "${CYAN}ℹ ${NC} $1"; }
success() { echo -e "${GREEN}✓ ${NC} $1"; }
warn()    { echo -e "${YELLOW}⚠ ${NC} $1"; }
error()   { echo -e "${RED}✗ ${NC} $1"; }
step()    { echo ""; echo -e "${BOLD}━━━ Step $1 of 6: $2 ━━━${NC}"; echo ""; }

ask() {
  local prompt="$1" default="$2" var="$3"
  if [ -n "$default" ]; then
    read -rp "$(echo -e "  ${BOLD}$prompt${NC} [$default]: ")" input
    eval "$var='${input:-$default}'"
  else
    read -rp "$(echo -e "  ${BOLD}$prompt${NC}: ")" input
    eval "$var='$input'"
  fi
}

ask_yn() {
  local prompt="$1" default="${2:-y}"
  read -rp "$(echo -e "  ${BOLD}$prompt${NC} [${default}]: ")" input
  input="${input:-$default}"
  [[ "$input" =~ ^[Yy] ]]
}

pause_continue() {
  echo ""
  read -rp "$(echo -e "  ${DIM}Press Enter to continue...${NC}")" _
}

# ─── Step 0: Prerequisites ───

banner

info "Let's get your social media scheduler up and running!"
echo "  This takes about 5 minutes (plus time for each social platform)."
echo ""

info "Checking prerequisites..."
echo ""

# Check Node.js
if ! command -v node >/dev/null 2>&1; then
  error "Node.js is not installed."
  echo ""
  echo "  How to install Node.js:"
  echo -e "  ${CYAN}• Mac:${NC}     brew install node"
  echo -e "  ${CYAN}• Windows:${NC} Download from https://nodejs.org (LTS version)"
  echo -e "  ${CYAN}• Linux:${NC}   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs"
  echo ""
  echo "  After installing, run this script again: bash setup.sh"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  error "Node.js 18+ is required. You have $(node -v)"
  echo ""
  echo "  Update Node.js: https://nodejs.org (download the LTS version)"
  exit 1
fi

# Check npx
if ! command -v npx >/dev/null 2>&1; then
  error "npx is not installed (should come with Node.js)."
  echo "  Try reinstalling Node.js from https://nodejs.org"
  exit 1
fi

# Detect package manager
if command -v bun >/dev/null 2>&1; then
  PKG="bun"
  INSTALL="bun install"
elif command -v pnpm >/dev/null 2>&1; then
  PKG="pnpm"
  INSTALL="pnpm install"
else
  PKG="npm"
  INSTALL="npm install"
fi

success "Node.js $(node -v)  •  Package manager: $PKG"

# ─── Step 1: Install dependencies ───

step 1 "Install Dependencies"

info "This installs all the libraries the app needs."

if ask_yn "Install dependencies with $PKG?" "y"; then
  echo ""
  $INSTALL
  echo ""
  success "Dependencies installed"
else
  warn "Skipping — make sure you already ran: $INSTALL"
fi

# ─── Step 2: Set up Convex (backend) ───

step 2 "Set Up Convex (Your Backend)"

echo "  Convex is a free cloud backend that handles:"
echo "  • Database (stores your posts, accounts, tokens)"
echo "  • Scheduled jobs (publishes posts at the right time)"
echo "  • File storage (uploaded images and videos)"
echo "  • Real-time sync (dashboard updates instantly)"
echo ""
echo -e "  ${BOLD}What will happen:${NC}"
echo "  1. Your browser will open the Convex sign-up page"
echo "  2. Sign up with GitHub or Google (free, no credit card)"
echo "  3. Click 'Create a project' and give it a name (e.g. 'my-scheduler')"
echo "  4. The terminal will automatically receive the connection details"
echo ""
echo -e "  ${DIM}Free tier: 1M function calls/month, 1GB storage — plenty for personal use.${NC}"

if [ -f ".env.local" ] && grep -q "CONVEX_DEPLOYMENT" .env.local 2>/dev/null; then
  echo ""
  success "Convex project already configured (found in .env.local)"
  CONVEX_URL=$(grep "NEXT_PUBLIC_CONVEX_URL" .env.local 2>/dev/null | cut -d= -f2-)
  echo -e "  ${DIM}URL: $CONVEX_URL${NC}"
else
  pause_continue

  echo ""
  info "Opening Convex in your browser..."
  echo -e "  ${DIM}(waiting for you to create the project — take your time)${NC}"
  echo ""

  npx convex dev --once

  if [ -f ".env.local" ] && grep -q "CONVEX_DEPLOYMENT" .env.local 2>/dev/null; then
    success "Convex project created and connected!"
    CONVEX_URL=$(grep "NEXT_PUBLIC_CONVEX_URL" .env.local 2>/dev/null | cut -d= -f2-)
  else
    error "Something went wrong. Try running: npx convex dev --once"
    exit 1
  fi
fi

# Derive the HTTP actions URL (.site instead of .cloud)
if [ -n "$CONVEX_URL" ]; then
  SITE_URL=$(echo "$CONVEX_URL" | sed 's/\.cloud/.site/')
  if ! grep -q "NEXT_PUBLIC_CONVEX_SITE_URL" .env.local 2>/dev/null; then
    echo "NEXT_PUBLIC_CONVEX_SITE_URL=$SITE_URL" >> .env.local
  fi
  success "Convex site URL: $SITE_URL"
fi

# ─── Step 3: Encryption key ───

step 3 "Generate Encryption Key"

echo "  This creates a key to encrypt your social media tokens at rest."
echo "  It's stored securely on Convex (not in any local files)."
echo ""

if command -v openssl >/dev/null 2>&1; then
  ENC_KEY=$(openssl rand -hex 32)
else
  ENC_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
fi

npx convex env set TOKEN_ENCRYPTION_KEY "$ENC_KEY" 2>/dev/null || true
success "Encryption key generated and stored on Convex"
echo ""
echo -e "  ${YELLOW}${BOLD}⚠ Save this key somewhere safe (password manager, notes):${NC}"
echo -e "  ${BOLD}$ENC_KEY${NC}"
echo -e "  ${DIM}You'll need it if you ever recreate your Convex project.${NC}"

# ─── Step 4: App URL ───

step 4 "Set Your App URL"

echo "  Where will you access this app?"
echo ""
echo "  Common options:"
echo -e "  • ${CYAN}http://localhost:3000${NC}         — Running on your computer (development)"
echo -e "  • ${CYAN}https://scheduler.mydomain.com${NC} — Custom domain (production)"
echo -e "  • ${CYAN}https://my-app.vercel.app${NC}     — Deployed on Vercel"
echo ""

ask "Your app URL" "http://localhost:3000" APP_URL
echo ""

npx convex env set APP_URL "$APP_URL" 2>/dev/null || true

if [ -n "$SITE_URL" ]; then
  npx convex env set CONVEX_SITE_URL "$SITE_URL" 2>/dev/null || true
fi

success "App URL set to $APP_URL"

# ─── Step 5: Platform OAuth (optional) ───

step 5 "Connect Social Platforms (Optional)"

echo "  Each platform requires API credentials from their developer portal."
echo "  This is the longest part — about 10-30 minutes per platform."
echo ""
echo -e "  ${BOLD}You can skip all of these now and add them later!${NC}"
echo "  The app works without any platforms connected."
echo ""

if [ -n "$SITE_URL" ]; then
  echo "  Your OAuth callback URLs (you'll need these when setting up each platform):"
  echo ""
  echo -e "  Facebook/Instagram: ${GREEN}${SITE_URL}/oauth/facebook/callback${NC}"
  echo -e "  TikTok:             ${GREEN}${SITE_URL}/oauth/tiktok/callback${NC}"
  echo -e "  Twitter/X:          ${GREEN}${SITE_URL}/oauth/twitter/callback${NC}"
  echo -e "  Threads:            ${GREEN}${SITE_URL}/oauth/threads/callback${NC}"
  echo ""
fi

setup_platform() {
  local name="$1" id_var="$2" secret_var="$3" docs="$4" callback_path="$5"

  if ask_yn "Set up $name now?" "n"; then
    echo ""
    echo -e "  Developer portal: ${CYAN}$docs${NC}"
    if [ -n "$SITE_URL" ]; then
      echo -e "  Callback URL:     ${GREEN}${SITE_URL}/oauth/${callback_path}/callback${NC}"
    fi
    echo ""
    ask "$name App/Client ID" "" CLIENT_ID
    ask "$name App/Client Secret" "" CLIENT_SECRET

    if [ -n "$CLIENT_ID" ] && [ -n "$CLIENT_SECRET" ]; then
      npx convex env set "$id_var" "$CLIENT_ID" 2>/dev/null || true
      npx convex env set "$secret_var" "$CLIENT_SECRET" 2>/dev/null || true
      success "$name configured!"
    else
      warn "Skipped — no credentials entered"
    fi
  else
    info "Skipping $name (add later with: npx convex env set $id_var <value>)"
  fi
  echo ""
}

setup_platform "Facebook"  "FACEBOOK_APP_ID"   "FACEBOOK_APP_SECRET"   "https://developers.facebook.com/apps" "facebook"
setup_platform "Instagram" "INSTAGRAM_APP_ID"   "INSTAGRAM_APP_SECRET"  "https://developers.facebook.com/apps (same Meta app)" "facebook"
setup_platform "TikTok"    "TIKTOK_CLIENT_KEY"  "TIKTOK_CLIENT_SECRET"  "https://developers.tiktok.com" "tiktok"
setup_platform "Twitter"   "TWITTER_CLIENT_ID"  "TWITTER_CLIENT_SECRET" "https://developer.x.com/en/portal" "twitter"
setup_platform "Threads"   "THREADS_APP_ID"     "THREADS_APP_SECRET"    "https://developers.facebook.com/apps (same Meta app)" "threads"

# ─── Step 6: Deploy backend ───

step 6 "Deploy Backend"

info "Deploying your Convex backend functions..."
echo ""
npx convex dev --once 2>/dev/null || true
success "Backend deployed!"

# ─── Summary ───

echo ""
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║   ✓  Setup complete!                     ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}Start your scheduler:${NC}"
echo -e "  ${CYAN}npm run dev${NC}"
echo ""
echo -e "  Then open: ${CYAN}${APP_URL}${NC}"
echo ""
echo -e "  ${BOLD}Add platforms later:${NC}"
echo -e "  ${CYAN}npx convex env set FACEBOOK_APP_ID your_app_id${NC}"
echo -e "  ${CYAN}npx convex env set FACEBOOK_APP_SECRET your_secret${NC}"
echo ""
echo -e "  ${BOLD}Update to latest version:${NC}"
echo -e "  ${CYAN}bash update.sh${NC}"
echo ""
echo -e "  ${BOLD}Deploy with Docker:${NC}"
echo -e "  ${CYAN}cp .env.example .env${NC}"
echo -e "  ${CYAN}# Fill in your Convex URLs in .env${NC}"
echo -e "  ${CYAN}docker compose up -d${NC}"
echo ""

#!/usr/bin/env bash
set -e

# ─────────────────────────────────────────────
#  PostBox — Update Script
#  Run this whenever you want to update to the latest version.
#  Usage: bash update.sh
# ─────────────────────────────────────────────

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

info()    { echo -e "${CYAN}ℹ ${NC} $1"; }
success() { echo -e "${GREEN}✓ ${NC} $1"; }
warn()    { echo -e "${YELLOW}⚠ ${NC} $1"; }
error()   { echo -e "${RED}✗ ${NC} $1"; }

echo ""
echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}${BOLD}║   PostBox — Update        ║${NC}"
echo -e "${CYAN}${BOLD}╚══════════════════════════════════════════╝${NC}"
echo ""

# ─── Safety check ───
if [ ! -f "package.json" ]; then
  error "Run this from the social-media-scheduler folder"
  echo "  cd social-media-scheduler && bash update.sh"
  exit 1
fi

# ─── Check for uncommitted changes ───
if command -v git >/dev/null 2>&1 && [ -d ".git" ]; then
  if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
    warn "You have local changes. Stashing them before updating..."
    git stash push -m "auto-stash before update $(date +%Y-%m-%d_%H:%M)"
    STASHED=true
    success "Changes stashed (they're safe, don't worry)"
  fi
fi

# ─── Step 1: Pull latest code ───
info "Pulling latest version..."

if command -v git >/dev/null 2>&1 && [ -d ".git" ]; then
  BEFORE=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
  git pull --ff-only origin main 2>/dev/null || git pull origin main
  AFTER=$(git rev-parse HEAD 2>/dev/null || echo "unknown")

  if [ "$BEFORE" = "$AFTER" ]; then
    success "Already up to date! No changes to apply."
    echo ""
    exit 0
  fi

  # Show what changed
  echo ""
  info "Changes since your last update:"
  git log --oneline "$BEFORE".."$AFTER" 2>/dev/null | head -20 | while read -r line; do
    echo "  • $line"
  done
  echo ""
else
  warn "Not a git repository — skipping pull."
  warn "Download the latest version from GitHub and replace your files."
  echo ""
fi

# ─── Step 2: Install dependencies ───
info "Installing dependencies..."

if command -v bun >/dev/null 2>&1; then
  bun install
elif command -v pnpm >/dev/null 2>&1; then
  pnpm install
else
  npm install
fi

success "Dependencies updated"
echo ""

# ─── Step 3: Deploy Convex functions ───
info "Deploying updated backend functions to Convex..."

if [ -f ".env.local" ] && grep -q "CONVEX_DEPLOYMENT" .env.local 2>/dev/null; then
  npx convex deploy --yes 2>/dev/null || npx convex dev --once
  success "Backend functions deployed"
else
  warn "No Convex project found — skipping backend deploy."
  warn "If this is a fresh install, run: bash setup.sh"
fi
echo ""

# ─── Step 4: Rebuild if using Docker ───
if [ -f "docker-compose.yml" ] && command -v docker >/dev/null 2>&1; then
  if docker compose ps 2>/dev/null | grep -q "scheduler\|app"; then
    info "Docker container detected — rebuilding..."
    docker compose build
    docker compose up -d
    success "Docker container updated and restarted"
    echo ""
  fi
fi

# ─── Restore stashed changes ───
if [ "$STASHED" = "true" ]; then
  info "Restoring your local changes..."
  git stash pop 2>/dev/null || warn "Could not auto-restore changes. Run: git stash pop"
  success "Local changes restored"
  echo ""
fi

# ─── Done ───
echo -e "${GREEN}${BOLD}══════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  Update complete!${NC}"
echo -e "${GREEN}${BOLD}══════════════════════════════════════════${NC}"
echo ""
echo "  If you were running the dev server, restart it:"
echo -e "  ${CYAN}npm run dev${NC}"
echo ""
echo "  If deployed to Vercel, push your changes:"
echo -e "  ${CYAN}git push${NC}"
echo ""

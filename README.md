# PostBox Free: Social Media Scheduler
<p align="center">
  <img src="https://github.com/user-attachments/assets/caa53d26-a532-43cc-897d-1e17e88fa15f" alt="PostBox" width="200" />
</p>
This is a free, open-source, self-hosted social media scheduler. Post to Facebook, Instagram, TikTok, Twitter/X, and Threads from one dashboard — no monthly fees, no vendor lock-in.

Built for people who want to own their tools.

## Features

- **Multi-platform publishing** — Facebook (feed + story), Instagram (feed + story + reel), TikTok, Twitter/X, Threads
- **Scheduled & instant posts** — Post now or schedule for later with timezone support
- **Calendar view** — Visual calendar showing all your scheduled and published posts
- **Media upload** — Drag-and-drop images and videos
- **Token auto-refresh** — Proactive cron keeps your OAuth tokens alive
- **Encrypted credentials** — AES-256-GCM encryption for all stored tokens
- **Self-hosted** — Your data stays on your infrastructure

## Features in Pro versions
- **Analytics dashboard** — Track followers, engagement, views, and top posts across all accounts
- **Teams members setup** - Invite many users to your dashboard
- **Support**- get support for any issue you face during installation or scheduling posts


## Architecture

```
┌─────────────────┐         ┌──────────────────────┐
│   Next.js App   │ ←────→  │   Convex (Backend)   │
│  (you host it)  │         │  (cloud, free tier)   │
│                 │         │                       │
│  • Dashboard    │         │  • Database            │
│  • Post composer│         │  • Scheduled jobs      │
│  • Calendar     │         │  • OAuth callbacks     │
│  • Analytics    │         │  • File storage        │
└─────────────────┘         │  • Token encryption    │
                            └──────────────────────┘
```

**Convex free tier** gives you 1M function calls/month, 1GB storage, and 256MB database — more than enough for personal use and small teams.

## Quick Start

### Option 1: Docker (recommended)

No Node.js or programming tools needed — just [Docker Desktop](https://www.docker.com/products/docker-desktop/).

**Step 1: Create a free Convex project**

1. Go to [dashboard.convex.dev](https://dashboard.convex.dev) and sign up (free)
2. Create a new project
3. In Settings, copy your **Deployment URL** (looks like `https://happy-animal-123.convex.cloud`)
4. In Settings → **Deploy Keys**, click **Generate** to create a production deploy key

**Step 2: Configure**

```bash
git clone https://github.com/YOUR_USERNAME/social-media-scheduler.git
cd social-media-scheduler
cp .env.example .env
```

Open `.env` and fill in your 3 required values:

```env
NEXT_PUBLIC_CONVEX_URL=https://happy-animal-123.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://happy-animal-123.convex.site
CONVEX_DEPLOY_KEY=prod:happy-animal-123|eyJ2...
```

Optionally add platform credentials (Facebook, Instagram, etc.) in the same file — or add them later.

**Step 3: Launch**

```bash
docker compose up -d
```

On first launch (~30 seconds), Docker automatically:
- Deploys all backend functions to Convex
- Generates authentication keys (JWT + encryption)
- Pushes your platform credentials to Convex

Open [http://localhost:3000](http://localhost:3000) — you're done!

### Option 2: Manual Setup (for developers)

Requires Node.js 18+ installed.

```bash
git clone https://github.com/YOUR_USERNAME/social-media-scheduler.git
cd social-media-scheduler
bash setup.sh
```

The setup script walks you through everything interactively:
1. Installs dependencies
2. Creates your Convex project (free)
3. Generates encryption and auth keys
4. Prompts for OAuth credentials (optional, add later)
5. Deploys backend functions

Then start the dev server:

```bash
npm run dev
```

### Option 3: Deploy to Vercel

Deploy to Vercel directly from your local machine — no GitHub required, fully automated.

Requires Node.js 18+ installed.

**Step 1: Get your tokens**

1. [Vercel](https://vercel.com/account/tokens) → Create a token
2. [Convex](https://dashboard.convex.dev) → Create a project → Settings → Deploy Keys → Generate

**Step 2: Configure**

```bash
git clone https://github.com/YOUR_USERNAME/social-media-scheduler.git
cd social-media-scheduler
cp .env.example .env
```

Fill in `.env` with your Convex values + `VERCEL_TOKEN` (+ optional platform credentials).

**Step 3: Deploy**

```bash
bash deploy-vercel.sh
```

Zero prompts — the script automatically:
1. Installs dependencies
2. Generates auth & encryption keys
3. Pushes all env vars to Convex
4. Deploys backend functions
5. Deploys to Vercel
6. Returns your live URL

**Updating:**

```bash
bash deploy-vercel.sh --update
```

## Connecting Social Platforms

Each platform requires you to create a developer app and get API credentials. This is the longest part of setup (10-30 minutes per platform), but you only do it once.

### Callback URLs

When setting up each platform's OAuth app, you'll need to register a callback URL:

```
https://YOUR_CONVEX_SLUG.convex.site/oauth/PLATFORM/callback
```

Example: `https://happy-animal-123.convex.site/oauth/facebook/callback`

### Facebook & Instagram

Facebook and Instagram use the same Meta developer app.

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps)
2. Create a new app → Select "Other" → "Consumer"
3. Add the **Facebook Login** product
4. In Facebook Login → Settings, add your callback URL
5. In Settings → Basic, copy the **App ID** and **App Secret**

```bash
npx convex env set FACEBOOK_APP_ID your_app_id
npx convex env set FACEBOOK_APP_SECRET your_app_secret
# Instagram uses the same Meta app:
npx convex env set INSTAGRAM_APP_ID your_app_id
npx convex env set INSTAGRAM_APP_SECRET your_app_secret
```

**Required permissions:** `pages_manage_posts`, `pages_read_engagement`, `instagram_basic`, `instagram_content_publish`

### TikTok

1. Go to [developers.tiktok.com](https://developers.tiktok.com)
2. Create a new app
3. Add **Login Kit** and **Content Posting API** products
4. Add your callback URL
5. Copy the **Client Key** and **Client Secret**

```bash
npx convex env set TIKTOK_CLIENT_KEY your_client_key
npx convex env set TIKTOK_CLIENT_SECRET your_client_secret
```

**Required scopes:** `user.info.basic`, `video.publish`, `video.upload`

### Twitter / X

1. Go to [developer.x.com/en/portal](https://developer.x.com/en/portal)
2. Create a project and app
3. Set up OAuth 2.0 with PKCE (type: Web App)
4. Add your callback URL
5. Copy the **Client ID** and **Client Secret**

```bash
npx convex env set TWITTER_CLIENT_ID your_client_id
npx convex env set TWITTER_CLIENT_SECRET your_client_secret
```

**Required scopes:** `tweet.read`, `tweet.write`, `users.read`, `offline.access`, `media.write`

**X API tiers — what works on which plan**

Users bring their own X API credentials. Capabilities vary by plan (as of April 2026):

| Plan | Posting | Analytics |
|------|---------|-----------|
| **Free** | Works (≈500 tweets/month, 17/day) | Not available — no `public_metrics`, no follower counts |
| **Pay-per-use** (new default) | Works ($0.01 per post create) | Works ($0.01 per user lookup, $0.005 per post read) |
| **Basic** (legacy, $200/mo) | Works (3k/mo) | Limited `public_metrics` |
| **Pro** (legacy, $5k/mo) | Works (300k/mo) | Full (`non_public_metrics`, impressions, organic_metrics) |

In short: **posting and scheduling X posts is free**. Analytics (follower history, per-tweet impressions) requires a paid plan or pay-per-use credits, and will be added in a later phase — it will gracefully no-op when your X account is on the Free plan.

**Historical tweets in "All Posts"**: the app fetches your recent 25 tweets from `GET /2/users/:id/tweets` to display alongside posts you made through the scheduler. This endpoint is blocked on the Free tier (403), so free-tier users will only see tweets they posted through the scheduler itself — no error is shown, the X section simply stays empty. Pay-per-use and Basic/Pro accounts will see their native tweets with likes, replies, retweets, and impression counts.

### Threads

Uses the same Meta developer app as Facebook/Instagram:

1. Add the **Threads API** product to your Meta app
2. Add callback URL in Threads API settings

```bash
npx convex env set THREADS_APP_ID your_app_id
npx convex env set THREADS_APP_SECRET your_app_secret
```

## Environment Variables

### Frontend (.env.local)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_CONVEX_URL` | Yes | Convex deployment URL (`*.convex.cloud`) |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | Yes | Convex HTTP actions URL (`*.convex.site`) |
| `CONVEX_DEPLOYMENT` | Yes | Convex deployment slug (auto-set by `npx convex dev`) |

### Backend (set via `npx convex env set`)

| Variable | Required | Description |
|----------|----------|-------------|
| `TOKEN_ENCRYPTION_KEY` | Yes | 64-char hex string. Generate: `openssl rand -hex 32` |
| `APP_URL` | Yes | Public URL of your frontend |
| `CONVEX_SITE_URL` | Yes | Same as `NEXT_PUBLIC_CONVEX_SITE_URL` |
| `FACEBOOK_APP_ID` | Per platform | Facebook OAuth app ID |
| `FACEBOOK_APP_SECRET` | Per platform | Facebook OAuth app secret |
| `INSTAGRAM_APP_ID` | Per platform | Instagram OAuth app ID |
| `INSTAGRAM_APP_SECRET` | Per platform | Instagram OAuth app secret |
| `TIKTOK_CLIENT_KEY` | Per platform | TikTok client key |
| `TIKTOK_CLIENT_SECRET` | Per platform | TikTok client secret |
| `TWITTER_CLIENT_ID` | Per platform | Twitter/X client ID |
| `TWITTER_CLIENT_SECRET` | Per platform | Twitter/X client secret |
| `THREADS_APP_ID` | Per platform | Threads app ID |
| `THREADS_APP_SECRET` | Per platform | Threads app secret |

## Tech Stack

- **Frontend:** Next.js (App Router), Tailwind CSS, shadcn/ui
- **Backend:** [Convex](https://convex.dev) — database, real-time, cron, file storage
- **Auth:** @convex-dev/auth (password-based)
- **Charts:** Recharts
- **Icons:** Lucide, react-icons

## Updating

### Docker users

```bash
git pull && docker compose up -d --build
```

This pulls the latest code, rebuilds the container, and re-deploys updated backend functions to Convex automatically.

### Manual setup users

```bash
bash update.sh
```

This script automatically:
1. Pulls the latest code from GitHub
2. Installs any new dependencies
3. Deploys updated backend functions to Convex

Your settings, accounts, and scheduled posts are stored in Convex — they're never affected by updates.

### Manual update (if you prefer)

```bash
git pull
npm install
npx convex deploy
# Restart your app / redeploy
```

## Adding Platform Keys Later

You can add or change social platform credentials at any time without re-running setup:

```bash
# Set a new key
npx convex env set FACEBOOK_APP_ID your_app_id
npx convex env set FACEBOOK_APP_SECRET your_secret

# View current keys
npx convex env list
```

No restart needed — changes take effect immediately.

## Troubleshooting

### "npx convex" commands aren't working
Make sure you're in the project folder and have run `npm install`:
```bash
cd social-media-scheduler
npm install
```

### OAuth callback not working
Make sure your callback URL matches exactly:
```
https://YOUR_CONVEX_SLUG.convex.site/oauth/PLATFORM/callback
```
Find your slug in `.env` → `NEXT_PUBLIC_CONVEX_SITE_URL`

### Docker container won't start
Check that `.env` has your Convex URLs filled in:
```bash
cat .env
```

### Tokens expiring
The app auto-refreshes tokens via a Convex cron job. If tokens expire, disconnect and reconnect the account from the dashboard.

## License

MIT

## Contributing

Contributions welcome! Please open an issue first to discuss what you'd like to change.

// TikTok API helpers (OAuth 2.0 with PKCE)

const TIKTOK_AUTH = "https://www.tiktok.com/v2/auth/authorize/"
const TIKTOK_API = "https://open.tiktokapis.com/v2"

export function getTikTokAuthUrl(
  clientKey: string,
  redirectUri: string,
  state: string,
  codeChallenge: string
): string {
  const scopes = [
    "user.info.basic",
    "user.info.stats", // follower_count, likes_count, video_count (may need review)
    "video.publish",
    "video.upload",
    "video.list", // per-video analytics + inbox detection
  ].join(",")

  const params = new URLSearchParams({
    client_key: clientKey,
    redirect_uri: redirectUri,
    scope: scopes,
    response_type: "code",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  })

  return `${TIKTOK_AUTH}?${params}`
}

export interface TikTokTokens {
  access_token: string
  refresh_token: string
  expires_in: number
  refresh_expires_in: number
  open_id: string
  scope: string
  token_type: string
}

export async function exchangeTikTokCode(
  code: string,
  clientKey: string,
  clientSecret: string,
  redirectUri: string,
  codeVerifier: string
): Promise<TikTokTokens> {
  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  })

  const res = await fetch(`${TIKTOK_API}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(
      `TikTok token exchange failed: ${err.error_description || err.error || res.statusText}`
    )
  }
  return res.json()
}

export async function refreshTikTokToken(
  refreshToken: string,
  clientKey: string,
  clientSecret: string
): Promise<TikTokTokens> {
  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  })

  const res = await fetch(`${TIKTOK_API}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(
      `TikTok token refresh failed: ${err.error_description || err.error || res.statusText}`
    )
  }
  return res.json()
}

export interface TikTokUserInfo {
  open_id: string
  display_name: string
  avatar_url: string
  avatar_url_100?: string
}

export async function getTikTokUserInfo(
  accessToken: string
): Promise<TikTokUserInfo> {
  const fields = ["open_id", "display_name", "avatar_url", "avatar_url_100"]
  const params = new URLSearchParams({
    fields: fields.join(","),
  })

  const res = await fetch(`${TIKTOK_API}/user/info/?${params}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(
      `Failed to get TikTok user info: ${err.error?.message || res.statusText}`
    )
  }

  const data = await res.json()
  return data.data.user
}

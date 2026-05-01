// Instagram Graph API helpers (standalone OAuth, not via Facebook Pages)

const INSTAGRAM_API = "https://api.instagram.com"
const GRAPH_API = "https://graph.instagram.com"

export function getInstagramAuthUrl(
  clientId: string,
  redirectUri: string,
  state: string
): string {
  const scopes = [
    "instagram_business_basic",
    "instagram_business_content_publish",
    "instagram_business_manage_insights",
  ].join(",")

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    response_type: "code",
    state,
  })

  return `${INSTAGRAM_API}/oauth/authorize?${params}`
}

export async function exchangeInstagramCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<{ access_token: string; user_id: number }> {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  })

  const res = await fetch(`${INSTAGRAM_API}/oauth/access_token`, {
    method: "POST",
    body,
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(
      `Instagram token exchange failed: ${err.error_message || res.statusText}`
    )
  }
  return res.json()
}

export async function getLongLivedToken(
  shortLivedToken: string,
  clientSecret: string
): Promise<{
  access_token: string
  token_type: string
  expires_in: number
}> {
  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: clientSecret,
    access_token: shortLivedToken,
  })

  const res = await fetch(`${GRAPH_API}/access_token?${params}`)
  if (!res.ok) {
    const err = await res.json()
    throw new Error(
      `Instagram long-lived token exchange failed: ${err.error?.message || res.statusText}`
    )
  }
  return res.json()
}

export async function refreshInstagramToken(currentToken: string): Promise<{
  access_token: string
  token_type: string
  expires_in: number
}> {
  const params = new URLSearchParams({
    grant_type: "ig_refresh_token",
    access_token: currentToken,
  })

  const res = await fetch(`${GRAPH_API}/refresh_access_token?${params}`)
  if (!res.ok) {
    const err = await res.json()
    throw new Error(
      `Instagram token refresh failed: ${err.error?.message || res.statusText}`
    )
  }
  return res.json()
}

export interface InstagramUserInfo {
  id: string
  username: string
  account_type: string
  profile_picture_url?: string
}

export async function getInstagramUserInfo(
  accessToken: string
): Promise<InstagramUserInfo> {
  const params = new URLSearchParams({
    access_token: accessToken,
    fields: "id,username,account_type,profile_picture_url",
  })

  const res = await fetch(`${GRAPH_API}/me?${params}`)
  if (!res.ok) {
    const err = await res.json()
    throw new Error(
      `Failed to get Instagram user info: ${err.error?.message || res.statusText}`
    )
  }
  return res.json()
}

// Twitter/X API helpers (OAuth 2.0 with PKCE)

const TWITTER_AUTH = "https://twitter.com/i/oauth2/authorize";
const TWITTER_API = "https://api.x.com/2";

export function getTwitterAuthUrl(
  clientId: string,
  redirectUri: string,
  state: string,
  codeChallenge: string
): string {
  const scopes = [
    "tweet.read",
    "tweet.write",
    "users.read",
    "offline.access",
    "media.write",
  ].join(" ");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return `${TWITTER_AUTH}?${params}`;
}

export interface TwitterTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export async function exchangeTwitterCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  codeVerifier: string
): Promise<TwitterTokens> {
  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
    client_id: clientId,
  });

  const credentials = btoa(`${clientId}:${clientSecret}`);

  const res = await fetch(`${TWITTER_API}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(
      `Twitter token exchange failed: ${err.error_description || err.error || res.statusText}`
    );
  }
  return res.json();
}

export async function refreshTwitterToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<TwitterTokens> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  });

  const credentials = btoa(`${clientId}:${clientSecret}`);

  const res = await fetch(`${TWITTER_API}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(
      `Twitter token refresh failed: ${err.error_description || err.error || res.statusText}`
    );
  }
  return res.json();
}

export interface TwitterUserInfo {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
}

export async function getTwitterUserInfo(
  accessToken: string
): Promise<TwitterUserInfo> {
  const res = await fetch(`${TWITTER_API}/users/me?user.fields=profile_image_url`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(
      `Failed to get Twitter user info: ${err.detail || err.title || res.statusText}`
    );
  }

  const data = await res.json();
  return data.data;
}

// Threads API helpers

const THREADS_API = "https://graph.threads.net/v1.0";

export function getThreadsAuthUrl(
  clientId: string,
  redirectUri: string,
  state: string
): string {
  const scopes = [
    "threads_basic",
    "threads_content_publish",
    "threads_manage_insights",
    "threads_manage_replies",
    "threads_read_replies",
  ].join(",");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    response_type: "code",
    state,
  });

  return `https://threads.net/oauth/authorize?${params}`;
}

export async function exchangeThreadsCode(
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
  });

  const res = await fetch(`${THREADS_API}/oauth/access_token`, {
    method: "POST",
    body,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(
      `Threads token exchange failed: ${err.error?.message || res.statusText}`
    );
  }
  return res.json();
}

export async function exchangeForLongLivedToken(
  shortLivedToken: string,
  clientSecret: string
): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
}> {
  const params = new URLSearchParams({
    grant_type: "th_exchange_token",
    client_secret: clientSecret,
    access_token: shortLivedToken,
  });

  const res = await fetch(`${THREADS_API}/access_token?${params}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(
      `Threads long-lived token exchange failed: ${err.error?.message || res.statusText}`
    );
  }
  return res.json();
}

export async function refreshThreadsToken(
  currentToken: string
): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
}> {
  const params = new URLSearchParams({
    grant_type: "th_refresh_token",
    access_token: currentToken,
  });

  const res = await fetch(`${THREADS_API}/access_token?${params}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(
      `Threads token refresh failed: ${err.error?.message || res.statusText}`
    );
  }
  return res.json();
}

export interface ThreadsUserInfo {
  id: string;
  username: string;
  threads_profile_picture_url?: string;
}

export async function getThreadsUserInfo(
  accessToken: string
): Promise<ThreadsUserInfo> {
  const params = new URLSearchParams({
    access_token: accessToken,
    fields: "id,username,threads_profile_picture_url",
  });

  const res = await fetch(`${THREADS_API}/me?${params}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(
      `Failed to get Threads user info: ${err.error?.message || res.statusText}`
    );
  }
  return res.json();
}

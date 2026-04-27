// Facebook Graph API helpers

const GRAPH_API = "https://graph.facebook.com/v22.0";

export function getFacebookAuthUrl(
  clientId: string,
  redirectUri: string,
  state: string
): string {
  const scopes = [
    "pages_manage_posts",
    "pages_read_engagement",
    "pages_show_list",
    "pages_read_user_content",
  ].join(",");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: scopes,
    response_type: "code",
  });

  return `https://www.facebook.com/v22.0/dialog/oauth?${params}`;
}

export async function exchangeFacebookCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<{ access_token: string; token_type: string }> {
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  });

  const res = await fetch(`${GRAPH_API}/oauth/access_token?${params}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(
      `Facebook token exchange failed: ${err.error?.message || res.statusText}`
    );
  }
  return res.json();
}

export async function debugFacebookToken(
  inputToken: string,
  appId: string,
  appSecret: string
): Promise<{
  data: {
    scopes?: string[];
    granular_scopes?: Array<{
      scope: string;
      target_ids?: string[];
    }>;
  };
}> {
  const appAccessToken = `${appId}|${appSecret}`;
  const params = new URLSearchParams({
    input_token: inputToken,
    access_token: appAccessToken,
  });

  const res = await fetch(`${GRAPH_API}/debug_token?${params}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Token debug failed: ${err.error?.message || res.statusText}`);
  }
  return res.json();
}

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category?: string;
  picture?: { data?: { url?: string } };
  instagram_business_account?: { id: string };
}

export async function getFacebookPages(
  userAccessToken: string
): Promise<FacebookPage[]> {
  const params = new URLSearchParams({
    access_token: userAccessToken,
    fields: "id,name,access_token,category,picture,instagram_business_account",
  });

  const res = await fetch(`${GRAPH_API}/me/accounts?${params}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(
      `Failed to get Facebook pages: ${err.error?.message || res.statusText}`
    );
  }

  const data = await res.json();
  return data.data || [];
}

export async function getFacebookPageById(
  pageId: string,
  userAccessToken: string
): Promise<FacebookPage | null> {
  const params = new URLSearchParams({
    access_token: userAccessToken,
    fields: "id,name,access_token,category,picture,instagram_business_account",
  });

  try {
    const res = await fetch(`${GRAPH_API}/${pageId}?${params}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export interface InstagramAccountInfo {
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
  account_type?: string;
}

export async function getInstagramAccountInfo(
  igUserId: string,
  pageAccessToken: string
): Promise<InstagramAccountInfo> {
  const params = new URLSearchParams({
    access_token: pageAccessToken,
    fields: "id,username,name,profile_picture_url,account_type",
  });

  const res = await fetch(`${GRAPH_API}/${igUserId}?${params}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(
      `Failed to get Instagram account info: ${err.error?.message || res.statusText}`
    );
  }
  return res.json();
}

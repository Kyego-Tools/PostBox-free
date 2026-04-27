// X/Twitter author timeline → PostInsight[]
//
// Endpoint: GET https://api.x.com/2/users/:id/tweets
//   tweet.fields=created_at,public_metrics,attachments,text
//   expansions=attachments.media_keys
//   media.fields=url,preview_image_url,type
//   exclude=retweets,replies
//
// Requires Bearer token with tweet.read + users.read scopes. Free X API tier
// rejects this endpoint with 403 — we catch and return [] so downstream
// (analyticsCache + posts.listAll) just shows nothing for that account.

import type { PostInsight } from "./types";

const API = "https://api.x.com/2";

interface XTweet {
  id: string;
  text: string;
  created_at?: string;
  public_metrics?: {
    retweet_count?: number;
    reply_count?: number;
    like_count?: number;
    quote_count?: number;
    bookmark_count?: number;
    impression_count?: number;
  };
  attachments?: { media_keys?: string[] };
}

interface XMedia {
  media_key: string;
  type: "photo" | "video" | "animated_gif" | string;
  url?: string;
  preview_image_url?: string;
}

interface XTimelineResponse {
  data?: XTweet[];
  includes?: { media?: XMedia[] };
  meta?: { result_count?: number };
}

export async function fetchTwitterPosts(
  userId: string,
  username: string,
  token: string,
  limit: number = 25,
): Promise<PostInsight[]> {
  const params = new URLSearchParams({
    max_results: String(Math.min(Math.max(limit, 5), 100)),
    exclude: "retweets,replies",
    "tweet.fields": "created_at,public_metrics,attachments,text",
    expansions: "attachments.media_keys",
    "media.fields": "url,preview_image_url,type",
  });

  let res: Response;
  try {
    res = await fetch(`${API}/users/${userId}/tweets?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    console.error("twitter posts: network error", err);
    return [];
  }

  if (!res.ok) {
    // Gracefully swallow expected tier / auth / rate-limit errors. The
    // action still caches the empty result so we don't thrash the API.
    if (res.status === 401) {
      console.warn("twitter posts: unauthorized (token revoked or scope missing)");
    } else if (res.status === 403) {
      console.warn(
        "twitter posts: tier does not allow reading user timeline (Free tier is write-only)",
      );
    } else if (res.status === 429) {
      const reset = res.headers.get("x-rate-limit-reset");
      console.warn(
        `twitter posts: rate-limited${reset ? ` (resets at ${reset})` : ""}`,
      );
    } else {
      const body = await res.text().catch(() => res.statusText);
      console.error(`twitter posts: API error ${res.status}: ${body}`);
    }
    return [];
  }

  const body = (await res.json()) as XTimelineResponse;
  const tweets = body.data ?? [];
  if (tweets.length === 0) return [];

  const mediaByKey = new Map<string, XMedia>();
  for (const m of body.includes?.media ?? []) {
    mediaByKey.set(m.media_key, m);
  }

  return tweets.map((t) => mapTweet(t, username, mediaByKey));
}

function mapTweet(
  tweet: XTweet,
  username: string,
  mediaByKey: Map<string, XMedia>,
): PostInsight {
  const pm = tweet.public_metrics ?? {};
  const likes = pm.like_count ?? 0;
  const replies = pm.reply_count ?? 0;
  const retweets = pm.retweet_count ?? 0;
  const quotes = pm.quote_count ?? 0;
  const impressions = pm.impression_count ?? 0;
  const shares = retweets + quotes;

  const totalEng = likes + replies + retweets + quotes;
  const engagementRate =
    impressions > 0 ? parseFloat(((totalEng / impressions) * 100).toFixed(2)) : 0;

  let fullPicture: string | undefined;
  const firstKey = tweet.attachments?.media_keys?.[0];
  if (firstKey) {
    const media = mediaByKey.get(firstKey);
    fullPicture = media?.url ?? media?.preview_image_url;
  }

  return {
    postId: tweet.id,
    message: tweet.text,
    createdTime: tweet.created_at ?? new Date().toISOString(),
    fullPicture,
    permalinkUrl: `https://x.com/${username}/status/${tweet.id}`,
    views: impressions,
    reach: 0, // X has no public reach metric; leave at 0 so the UI hides it.
    reactions: likes,
    comments: replies,
    shares,
    engagementRate,
  };
}

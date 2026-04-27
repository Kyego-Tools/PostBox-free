// Routes a publish request to the correct platform publisher

import { publishToFacebook } from "../platforms/publish/facebook";
import { publishToInstagram } from "../platforms/publish/instagram";
import { publishToTikTok } from "../platforms/publish/tiktok";
import { publishToTwitter } from "../platforms/publish/twitter";
import type { PublishOptions, PublishResult } from "../platforms/publish/types";

type Platform = "facebook" | "instagram" | "tiktok" | "twitter" | "threads";

const publishers: Record<Platform, (opts: PublishOptions) => Promise<PublishResult>> = {
  facebook: publishToFacebook,
  instagram: publishToInstagram,
  tiktok: publishToTikTok,
  twitter: publishToTwitter,
  threads: async () => ({
    success: false,
    error: "Threads publishing not yet supported via API",
  }),
};

/**
 * Dispatch a publish request to the correct platform.
 * Returns the result from the platform's publisher.
 */
export async function dispatchPublish(
  platform: Platform,
  opts: PublishOptions
): Promise<PublishResult> {
  const publisher = publishers[platform];
  if (!publisher) {
    return { success: false, error: `Unsupported platform: ${platform}` };
  }
  return publisher(opts);
}

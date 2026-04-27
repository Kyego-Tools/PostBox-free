// Resolve media file IDs to public URLs via Convex storage

import type { Id } from "../../_generated/dataModel";

interface MediaFile {
  _id: Id<"mediaFiles">;
  storageId: Id<"_storage">;
}

/**
 * Given media file records and a URL resolver,
 * return an array of public URLs for the platform APIs.
 */
export async function resolveMediaUrls(
  mediaFiles: MediaFile[],
  getUrl: (storageId: Id<"_storage">) => Promise<string | null>
): Promise<string[]> {
  const urls: string[] = [];

  for (const file of mediaFiles) {
    const url = await getUrl(file.storageId);
    if (!url) {
      throw new Error(`Failed to get URL for media file ${file._id}`);
    }
    urls.push(url);
  }

  return urls;
}

// Shared HTTP helpers for platform publishing

/**
 * POST with URL-encoded form body, return JSON
 */
export async function postForm<T = Record<string, unknown>>(
  url: string,
  params: Record<string, string>,
): Promise<T> {
  const body = new URLSearchParams(params);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`API error (${res.status}): ${JSON.stringify(err)}`);
  }

  return res.json() as Promise<T>;
}

/**
 * POST with JSON body, return JSON
 */
export async function postJson<T = Record<string, unknown>>(
  url: string,
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`API error (${res.status}): ${JSON.stringify(err)}`);
  }

  return res.json() as Promise<T>;
}

/**
 * GET request, return JSON
 */
export async function apiGet<T = Record<string, unknown>>(
  url: string,
): Promise<T> {
  const res = await fetch(url);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`API error (${res.status}): ${JSON.stringify(err)}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Sleep helper for polling
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

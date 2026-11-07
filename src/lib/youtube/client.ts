import "server-only";

const BASE_URL = "https://www.googleapis.com/youtube/v3";

export class YouTubeApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public reason?: string,
  ) {
    super(message);
    this.name = "YouTubeApiError";
  }
}

/** Gọi YouTube Data API v3. API key chỉ tồn tại ở server. */
export async function ytFetch<T>(
  path: string,
  params: Record<string, string | number | undefined>,
): Promise<T> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    throw new YouTubeApiError("Chưa cấu hình YOUTUBE_API_KEY trong .env.local", 500, "missingKey");
  }

  const url = new URL(`${BASE_URL}/${path}`);
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(name, String(value));
  }
  url.searchParams.set("key", key);

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const reason: string | undefined = body?.error?.errors?.[0]?.reason;
    const message: string = body?.error?.message ?? res.statusText;
    throw new YouTubeApiError(message, res.status, reason);
  }
  return res.json() as Promise<T>;
}

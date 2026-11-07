export const VIDEO_ID_RE = /^[\w-]{11}$/;

/** Nhận URL YouTube (watch, youtu.be, shorts, embed, live) hoặc ID thuần, trả về video ID. */
export function parseYouTubeId(input: string): string | null {
  const value = input.trim();
  if (VIDEO_ID_RE.test(value)) return value;

  let url: URL;
  try {
    url = new URL(value.startsWith("http") ? value : `https://${value}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^(www|m|music)\./, "");
  let id: string | null = null;
  if (host === "youtu.be") {
    id = url.pathname.split("/")[1] ?? null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") {
      id = url.searchParams.get("v");
    } else {
      const match = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/);
      id = match?.[1] ?? null;
    }
  }
  return id && VIDEO_ID_RE.test(id) ? id : null;
}

/** ISO 8601 duration (PT1H2M3S) → giây. */
export function parseIsoDuration(iso: string): number {
  const match = iso.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;
  const [, d, h, m, s] = match.map((n) => Number(n ?? 0));
  return d * 86400 + h * 3600 + m * 60 + s;
}

export function formatDuration(totalSec: number): string {
  const sec = Math.floor(totalSec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

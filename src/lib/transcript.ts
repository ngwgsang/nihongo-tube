import "server-only";
import { cacheLife } from "next/cache";
import { ProxyAgent, fetch as undiciFetch } from "undici";
import { analyzeSentences } from "./japanese/analyze";
import type { Cue, SubtitleLanguage, Transcript } from "./youtube/types";

/*
 * YouTube Data API không cho tải phụ đề của video người khác, nên ở đây dùng
 * endpoint nội bộ (innertube) giống app di động để lấy danh sách caption track.
 * Không chính thức — có thể hỏng nếu YouTube thay đổi; khi đó trả về null.
 */

const INNERTUBE_URL = "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";

/*
 * Các client thử lần lượt: client đầu bị chặn (thường gặp với IP datacenter) hoặc phụ đề trả về rỗng
 * thì chuyển sang client sau. Chỉ giữ những client lấy được phụ đề mà không cần PO token.
 */
const CLIENTS = [
  {
    client: { clientName: "ANDROID", clientVersion: "20.10.38", androidSdkVersion: 34 },
    userAgent: "com.google.android.youtube/20.10.38 (Linux; U; Android 14)",
  },
  {
    client: {
      clientName: "IOS",
      clientVersion: "20.10.4",
      deviceMake: "Apple",
      deviceModel: "iPhone16,2",
      osName: "iPhone",
      osVersion: "18.3.2.22D82",
    },
    userAgent: "com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X;)",
  },
];
type Client = (typeof CLIENTS)[number];

/*
 * YouTube chặn IP datacenter (Vercel…) → đặt YOUTUBE_PROXY_URL (proxy residential,
 * dạng http://user:pass@host:port) để mọi request tới YouTube đi qua proxy đó.
 */
const proxy = process.env.YOUTUBE_PROXY_URL ? new ProxyAgent(process.env.YOUTUBE_PROXY_URL) : undefined;

function youtubeFetch(url: string | URL, init: { method?: string; headers?: Record<string, string>; body?: string } = {}) {
  return proxy ? undiciFetch(url, { ...init, dispatcher: proxy }) : fetch(url, init);
}

type CaptionTrack = {
  baseUrl: string;
  languageCode: string;
  kind?: string;
  name?: { simpleText?: string; runs?: { text: string }[] };
};
type Json3 = { events?: { tStartMs: number; dDurationMs?: number; segs?: { utf8: string }[] }[] };

async function getCaptionTracks(videoId: string, { client, userAgent }: Client): Promise<CaptionTrack[]> {
  const res = await youtubeFetch(INNERTUBE_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": userAgent },
    // hl=vi để tên các track trả về bằng tiếng Việt (vd "Tiếng Anh").
    body: JSON.stringify({ context: { client: { ...client, hl: "vi" } }, videoId }),
  });
  if (!res.ok) throw new Error(`innertube player ${res.status}`);
  const data = await res.json();
  // IP datacenter (Vercel, VPS…) thường bị chặn: status LOGIN_REQUIRED "Sign in to confirm you're
  // not a bot", không kèm caption. Ném lỗi để log ra lý do và không cache "không có phụ đề" nhiều ngày.
  const status = data?.playabilityStatus?.status;
  if (status && status !== "OK") {
    throw new Error(`innertube player ${status}: ${data.playabilityStatus.reason ?? ""}`);
  }
  return data?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
}

function toCues(json: Json3): Cue[] {
  const raw = (json.events ?? []).flatMap((e) => {
    const text = (e.segs ?? []).map((s) => s.utf8).join("").replace(/\s+/g, " ").trim();
    if (!text) return [];
    return [{ start: e.tStartMs / 1000, end: (e.tStartMs + (e.dDurationMs ?? 0)) / 1000, text }];
  });
  // Phụ đề tự động (ASR) thường chồng thời gian lên câu sau → cắt tại điểm bắt đầu câu kế tiếp.
  return raw.map((cue, i) => {
    const next = raw[i + 1];
    return next && next.start > cue.start ? { ...cue, end: Math.min(cue.end, next.start) } : cue;
  });
}

async function fetchCues(track: CaptionTrack): Promise<Cue[]> {
  const url = new URL(track.baseUrl);
  url.searchParams.set("fmt", "json3");
  const res = await youtubeFetch(url);
  if (!res.ok) throw new Error(`timedtext ${res.status}`);
  // Track đòi PO token thì YouTube trả 200 với body rỗng.
  const body = await res.text();
  if (!body) throw new Error("timedtext empty");
  return toCues(JSON.parse(body));
}

/**
 * Chạy `fn` với danh sách track của từng client cho tới khi một client thành công.
 * Mọi client đều lỗi thì ném lỗi gộp lý do của từng client.
 */
async function withClients<T>(videoId: string, fn: (tracks: CaptionTrack[]) => Promise<T>): Promise<T> {
  const errors: string[] = [];
  for (const c of CLIENTS) {
    try {
      return await fn(await getCaptionTracks(videoId, c));
    } catch (e) {
      errors.push(`${c.client.clientName}: ${e instanceof Error ? e.message : e}`);
    }
  }
  throw new Error(errors.join(" | "));
}

function overlap(a: Cue, b: Cue): number {
  return Math.min(a.end, b.end) - Math.max(a.start, b.start);
}

/**
 * Ghép phụ đề tiếng Việt vào từng câu tiếng Nhật. Hai track chia câu khác nhau nên mỗi câu
 * tiếng Việt được gán cho câu tiếng Nhật trùng thời gian nhiều nhất (xét câu chứa điểm giữa
 * và hai câu kề), rồi nối lại theo thứ tự.
 */
function alignTranslation(ja: Cue[], vi: Cue[]): (string | undefined)[] {
  const parts: string[][] = ja.map(() => []);
  for (const v of vi) {
    const mid = (v.start + v.end) / 2;
    let lo = 0;
    let hi = ja.length - 1;
    let i = 0;
    while (lo <= hi) {
      const m = (lo + hi) >> 1;
      if (ja[m].start <= mid) {
        i = m;
        lo = m + 1;
      } else {
        hi = m - 1;
      }
    }
    let best = i;
    for (const j of [i - 1, i + 1]) {
      if (ja[j] && overlap(ja[j], v) > overlap(ja[best], v)) best = j;
    }
    parts[best].push(v.text);
  }
  return parts.map((p) => (p.length ? p.join(" ") : undefined));
}

/** Track ưu tiên cho một ngôn ngữ: phụ đề thủ công trước, tự động sau. */
function pickTrack(tracks: CaptionTrack[], lang: string): CaptionTrack | undefined {
  const matches = tracks.filter((t) => t.languageCode === lang || t.languageCode.startsWith(`${lang}-`));
  return matches.find((t) => t.kind !== "asr") ?? matches[0];
}

/** Các ngôn ngữ phụ đề khác tiếng Nhật mà video có (mỗi mã một mục). */
function otherLanguages(tracks: CaptionTrack[]): SubtitleLanguage[] {
  const seen = new Map<string, SubtitleLanguage>();
  for (const t of tracks) {
    if (t.languageCode.startsWith("ja") || seen.has(t.languageCode)) continue;
    const name = t.name?.simpleText ?? t.name?.runs?.map((r) => r.text).join("") ?? t.languageCode;
    seen.set(t.languageCode, { code: t.languageCode, name });
  }
  // Tiếng Việt, tiếng Anh lên đầu danh sách; còn lại giữ thứ tự của YouTube.
  const rank = (code: string) => (code.startsWith("vi") ? 0 : code.startsWith("en") ? 1 : 2);
  return [...seen.values()].sort((a, b) => rank(a.code) - rank(b.code));
}

/**
 * Phụ đề ngôn ngữ phụ `lang`, đã ghép theo từng câu tiếng Nhật của getJapaneseTranscript
 * (cùng track, cùng cách cắt câu nên chỉ số khớp nhau). null nếu không có / lỗi.
 */
export async function getTranslation(videoId: string, lang: string): Promise<(string | null)[] | null> {
  "use cache";

  try {
    const result = await withClients(videoId, async (tracks) => {
      const jaTrack = pickTrack(tracks, "ja");
      const track = pickTrack(tracks, lang);
      if (!jaTrack || !track) return null;
      const [ja, other] = await Promise.all([fetchCues(jaTrack), fetchCues(track)]);
      return alignTranslation(ja, other).map((t) => t ?? null);
    });
    cacheLife("days");
    return result;
  } catch (e) {
    console.error("Translation captions failed", videoId, lang, e);
    cacheLife("minutes");
    return null;
  }
}

/**
 * Gắn từ vựng + ngữ pháp cho từng câu. Phân tích lỗi thì vẫn trả phụ đề (có thể thiếu
 * phân tích) kèm `complete: false` để chỉ cache ngắn và thử lại sau.
 */
async function withAnalysis(cues: Cue[]): Promise<{ cues: Cue[]; complete: boolean }> {
  try {
    const { results, failed } = await analyzeSentences(cues.map((c) => c.text));
    return { cues: cues.map((cue, i) => ({ ...cue, ...results[i] })), complete: !failed };
  } catch (e) {
    console.error("Japanese analysis failed", e);
    return { cues, complete: false };
  }
}

/** Phụ đề tiếng Nhật (ưu tiên phụ đề thủ công, sau đó tự động). null nếu video không có. */
export async function getJapaneseTranscript(videoId: string): Promise<Transcript | null> {
  "use cache";

  let found;
  try {
    found = await withClients(videoId, async (tracks) => {
      const track = pickTrack(tracks, "ja");
      return track ? { tracks, track, raw: await fetchCues(track) } : null;
    });
  } catch (e) {
    console.error("Japanese captions failed", videoId, e);
    throw e;
  }
  if (!found || found.raw.length === 0) {
    cacheLife("days");
    return null;
  }

  const { tracks, track, raw } = found;
  const { cues, complete } = await withAnalysis(raw);
  if (complete) cacheLife("days");
  else cacheLife("minutes");
  return { kind: track.kind === "asr" ? "asr" : "manual", cues, languages: otherLanguages(tracks) };
}

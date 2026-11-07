import "server-only";
import { cacheLife } from "next/cache";
import { CURATED_CHANNELS, VIDEOS_PER_CHANNEL } from "@/config/channels";
import { YouTubeApiError, ytFetch } from "./client";
import { filterJapanese } from "./filter";
import { parseIsoDuration } from "./parse";
import type {
  ListResponse,
  RawPlaylistItem,
  RawSearchResult,
  RawVideo,
  Video,
} from "./types";

/*
 * Lỗi ném ra từ hàm "use cache" bị serialize (mất class và các field như reason),
 * nên các hàm ở đây trả về ApiResult. Kết quả lỗi chỉ cache vài giây để lần sau thử lại.
 */

export type ApiError = { reason?: string; status: number; message: string };
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

function fail(e: unknown): { ok: false; error: ApiError } {
  if (e instanceof YouTubeApiError) {
    return { ok: false, error: { reason: e.reason, status: e.status, message: e.message } };
  }
  return { ok: false, error: { status: 0, message: e instanceof Error ? e.message : String(e) } };
}

function toVideo(raw: RawVideo): Video {
  const t = raw.snippet.thumbnails;
  return {
    id: raw.id,
    title: raw.snippet.title,
    channelId: raw.snippet.channelId,
    channelTitle: raw.snippet.channelTitle,
    publishedAt: raw.snippet.publishedAt,
    thumbnail: (t.high ?? t.medium ?? t.default)?.url ?? `https://i.ytimg.com/vi/${raw.id}/hqdefault.jpg`,
    durationSec: parseIsoDuration(raw.contentDetails.duration),
    audioLanguage: raw.snippet.defaultAudioLanguage,
    defaultLanguage: raw.snippet.defaultLanguage,
    embeddable: raw.status.embeddable,
    liveBroadcastContent: raw.snippet.liveBroadcastContent,
  };
}

/** videos.list — 1 unit / 50 video. Giữ nguyên thứ tự `ids`. */
export async function getVideos(ids: string[]): Promise<ApiResult<Video[]>> {
  "use cache";

  const unique = [...new Set(ids)];
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 50) chunks.push(unique.slice(i, i + 50));

  try {
    const pages = await Promise.all(
      chunks.map((chunk) =>
        ytFetch<ListResponse<RawVideo>>("videos", {
          part: "snippet,contentDetails,status",
          id: chunk.join(","),
          maxResults: 50,
        }),
      ),
    );
    const byId = new Map(pages.flatMap((p) => p.items).map((raw) => [raw.id, toVideo(raw)]));
    cacheLife("days");
    return { ok: true, data: unique.flatMap((id) => byId.get(id) ?? []) };
  } catch (e) {
    cacheLife("seconds");
    return fail(e);
  }
}

export async function getVideo(id: string): Promise<ApiResult<Video | null>> {
  const result = await getVideos([id]);
  return result.ok ? { ok: true, data: result.data[0] ?? null } : result;
}

type UploadsPage = { ids: string[]; nextPageToken?: string };

/** Một trang video của kênh qua uploads playlist (UC… → UU…) — 1 unit. */
async function getChannelUploadsPage(channelId: string, pageToken?: string): Promise<ApiResult<UploadsPage>> {
  "use cache";

  try {
    const res = await ytFetch<ListResponse<RawPlaylistItem>>("playlistItems", {
      part: "contentDetails",
      playlistId: `UU${channelId.slice(2)}`,
      maxResults: VIDEOS_PER_CHANNEL,
      pageToken,
    });
    cacheLife("hours");
    return {
      ok: true,
      data: { ids: res.items.map((item) => item.contentDetails.videoId), nextPageToken: res.nextPageToken },
    };
  } catch (e) {
    cacheLife("seconds");
    return fail(e);
  }
}

/** channelId → pageToken của trang kế tiếp. Kênh không còn trong cursor = đã hết video. */
export type FeedCursor = Record<string, string>;
/** FeedCursor cho kênh tuyển chọn, pageToken (string) cho tìm kiếm. */
export type Cursor = FeedCursor | string;
export type FeedPage = { videos: Video[]; cursor: Cursor | null };

/**
 * Video tiếng Nhật từ các kênh tuyển chọn, sắp xếp mới → cũ.
 * Không có cursor → trang đầu; có cursor → trang cũ hơn kế tiếp của từng kênh.
 */
export async function getCuratedFeed(cursor?: FeedCursor): Promise<ApiResult<FeedPage>> {
  "use cache";

  const targets = CURATED_CHANNELS.flatMap((c): { channelId: string; pageToken?: string }[] => {
    if (!cursor) return [{ channelId: c.id, pageToken: undefined }];
    const token = cursor[c.id];
    return typeof token === "string" ? [{ channelId: c.id, pageToken: token }] : [];
  });

  const results = await Promise.all(targets.map((t) => getChannelUploadsPage(t.channelId, t.pageToken)));

  const ids: string[] = [];
  const nextCursor: FeedCursor = {};
  let firstError: ApiError | undefined;
  results.forEach((r, i) => {
    const { channelId, pageToken } = targets[i];
    if (r.ok) {
      ids.push(...r.data.ids);
      if (r.data.nextPageToken) nextCursor[channelId] = r.data.nextPageToken;
    } else {
      firstError ??= r.error;
      // Kênh lỗi tạm thời → giữ nguyên vị trí để lần "tải thêm" sau thử lại.
      if (pageToken) nextCursor[channelId] = pageToken;
    }
  });
  // Tất cả kênh đều lỗi (thường là sai key / hết quota) → báo lỗi thay vì danh sách rỗng.
  if (ids.length === 0 && firstError) {
    cacheLife("seconds");
    return { ok: false, error: firstError };
  }

  const videos = await getVideos(ids);
  if (!videos.ok) {
    cacheLife("seconds");
    return videos;
  }
  cacheLife("hours");
  const sorted = filterJapanese(videos.data).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return {
    ok: true,
    data: { videos: sorted, cursor: Object.keys(nextCursor).length > 0 ? nextCursor : null },
  };
}

export type SearchOptions = {
  q: string;
  /** videoCategoryId của YouTube (vd: 25 = News & Politics) */
  categoryId?: string;
  order?: "relevance" | "date";
};

/** search.list — 100 unit/lần. Trang kế tiếp dùng nextPageToken làm cursor. */
export async function searchJapanese(
  options: SearchOptions,
  pageToken?: string,
): Promise<ApiResult<FeedPage>> {
  "use cache";

  let ids: string[];
  let nextPageToken: string | undefined;
  try {
    const res = await ytFetch<ListResponse<RawSearchResult>>("search", {
      part: "id",
      type: "video",
      q: options.q,
      videoCategoryId: options.categoryId,
      order: options.order,
      pageToken,
      maxResults: 50,
      relevanceLanguage: "ja",
      regionCode: "JP",
      videoEmbeddable: "true",
      safeSearch: "moderate",
    });
    ids = res.items.flatMap((item) => (item.id.videoId ? [item.id.videoId] : []));
    nextPageToken = res.nextPageToken;
  } catch (e) {
    cacheLife("seconds");
    return fail(e);
  }

  const videos = ids.length > 0 ? await getVideos(ids) : null;
  if (videos && !videos.ok) {
    cacheLife("seconds");
    return videos;
  }
  cacheLife("hours");
  return {
    ok: true,
    data: { videos: videos ? filterJapanese(videos.data) : [], cursor: ids.length > 0 ? (nextPageToken ?? null) : null },
  };
}

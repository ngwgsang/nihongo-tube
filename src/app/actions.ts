"use server";

import { loadFeed, type FeedSource } from "@/lib/feed";
import { getTranslation } from "@/lib/transcript";
import type { Cursor } from "@/lib/youtube/api";
import { VIDEO_ID_RE } from "@/lib/youtube/parse";

export async function loadMoreFeed(source: FeedSource, cursor: Cursor) {
  const validCursor =
    typeof cursor === "string" ||
    (cursor !== null && typeof cursor === "object" && Object.values(cursor).every((v) => typeof v === "string"));
  if (!validCursor) throw new Error("Invalid cursor");
  return loadFeed(source, cursor);
}

/** Phụ đề ngôn ngữ phụ ghép theo câu tiếng Nhật (null nếu video không có ngôn ngữ đó). */
export async function loadTranslation(videoId: string, lang: string) {
  if (typeof videoId !== "string" || !VIDEO_ID_RE.test(videoId)) throw new Error("Invalid video id");
  if (typeof lang !== "string" || !/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(lang)) throw new Error("Invalid language");
  return getTranslation(videoId, lang);
}

import "server-only";
import { findTopic } from "@/config/topics";
import { getCuratedFeed, searchJapanese, type ApiResult, type Cursor, type FeedPage } from "./youtube/api";

/** Nguồn của một danh sách video — chỉ chứa định danh, server tự tra ra tham số API. */
export type FeedSource =
  | { kind: "curated" }
  | { kind: "topic"; slug: string }
  | { kind: "query"; q: string };

export async function loadFeed(source: FeedSource, cursor?: Cursor): Promise<ApiResult<FeedPage>> {
  switch (source.kind) {
    case "curated":
      return getCuratedFeed(typeof cursor === "object" ? cursor : undefined);
    case "topic": {
      const topic = findTopic(source.slug);
      if (!topic) return { ok: false, error: { status: 404, message: "Chủ đề không tồn tại" } };
      return searchJapanese(topic.search, typeof cursor === "string" ? cursor : undefined);
    }
    case "query":
      return searchJapanese({ q: source.q }, typeof cursor === "string" ? cursor : undefined);
  }
}

import type { Video } from "./types";

const KANA_RE = /[぀-ヿ]/;
const MIN_DURATION_SEC = 60;

/**
 * Ưu tiên ngôn ngữ audio khai báo, sau đó tới ngôn ngữ metadata;
 * nếu không khai báo gì thì dựa vào việc tiêu đề có hiragana/katakana.
 */
export function isJapanese(video: Video): boolean {
  const declared = video.audioLanguage ?? video.defaultLanguage;
  if (declared) return declared.toLowerCase().startsWith("ja");
  return KANA_RE.test(video.title);
}

const SHORTS_RE = /#shorts?\b/i;

/** Embed được, không phải livestream/sắp phát, không phải Shorts. */
export function isPlayable(video: Video): boolean {
  return (
    video.embeddable &&
    video.liveBroadcastContent === "none" &&
    video.durationSec > MIN_DURATION_SEC &&
    !SHORTS_RE.test(video.title)
  );
}

export function filterJapanese(videos: Video[]): Video[] {
  return videos.filter((v) => isPlayable(v) && isJapanese(v));
}

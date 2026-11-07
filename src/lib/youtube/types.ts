import type { VocabItem, VocabSpan } from "@/lib/japanese/analyze";
import type { GrammarMatch } from "@/lib/japanese/grammar";

export type { GrammarMatch, VocabItem, VocabSpan };

export type Video = {
  id: string;
  title: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  thumbnail: string;
  durationSec: number;
  /** snippet.defaultAudioLanguage */
  audioLanguage?: string;
  /** snippet.defaultLanguage (ngôn ngữ của tiêu đề/mô tả) */
  defaultLanguage?: string;
  embeddable: boolean;
  liveBroadcastContent: string;
};

export type Cue = {
  /** giây */
  start: number;
  /** giây */
  end: number;
  text: string;
  /** Từ vựng trong câu (có khi phân tích thành công) */
  vocab?: VocabItem[];
  /** Vị trí các từ vựng trong `text`, để gạch chân */
  vocabSpans?: VocabSpan[];
  /** Vị trí ký tự bắt đầu mỗi từ (trừ từ đầu), để hiển thị tách từ */
  breaks?: number[];
  /** Mẫu ngữ pháp trong câu, vị trí ký tự tính theo `text` */
  grammar?: GrammarMatch[];
};

/** Một ngôn ngữ phụ đề khả dụng của video (dùng làm ngôn ngữ phụ). */
export type SubtitleLanguage = { code: string; name: string };

export type Transcript = {
  kind: "manual" | "asr";
  cues: Cue[];
  /** Các ngôn ngữ phụ đề khác tiếng Nhật mà video có */
  languages: SubtitleLanguage[];
};

// Raw response subsets of YouTube Data API v3

type Thumbnail = { url: string; width?: number; height?: number };

export type RawVideo = {
  id: string;
  snippet: {
    title: string;
    channelId: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: Partial<Record<"default" | "medium" | "high" | "standard" | "maxres", Thumbnail>>;
    defaultAudioLanguage?: string;
    defaultLanguage?: string;
    liveBroadcastContent: string;
  };
  contentDetails: { duration: string };
  status: { embeddable: boolean };
};

export type ListResponse<T> = {
  items: T[];
  nextPageToken?: string;
};

export type RawPlaylistItem = {
  contentDetails: { videoId: string };
};

export type RawSearchResult = {
  id: { kind: string; videoId?: string };
};

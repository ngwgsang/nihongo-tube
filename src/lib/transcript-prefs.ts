"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

/** Tuỳ chọn hiển thị transcript, lưu trong localStorage của trình duyệt này. */
export type TranscriptPrefs = {
  /** Chỉ số trong FONT_SIZES */
  size: number;
  /** Hiện dòng ngôn ngữ phụ dưới câu tiếng Nhật */
  showTranslation: boolean;
  /** Mã ngôn ngữ phụ ưa thích (vd "vi") */
  lang: string;
  /** Chèn khoảng trống nhỏ giữa các từ tiếng Nhật */
  segmented: boolean;
};

export const FONT_SIZES = ["Nhỏ", "Vừa", "Lớn", "Rất lớn"] as const;

const DEFAULTS: TranscriptPrefs = { size: 1, showTranslation: true, lang: "vi", segmented: false };
const KEY = "transcript-prefs";
const EVENT = "transcript-prefs-change";

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function parse(raw: string | null): TranscriptPrefs {
  if (!raw) return DEFAULTS;
  try {
    const v = JSON.parse(raw);
    return {
      size: Number.isInteger(v.size) && v.size >= 0 && v.size < FONT_SIZES.length ? v.size : DEFAULTS.size,
      showTranslation: typeof v.showTranslation === "boolean" ? v.showTranslation : DEFAULTS.showTranslation,
      lang: typeof v.lang === "string" ? v.lang : DEFAULTS.lang,
      segmented: typeof v.segmented === "boolean" ? v.segmented : DEFAULTS.segmented,
    };
  } catch {
    return DEFAULTS;
  }
}

export function useTranscriptPrefs() {
  // Server và lần render đầu dùng mặc định; sau hydrate mới đọc localStorage.
  const raw = useSyncExternalStore(subscribe, read, () => null);
  const prefs = useMemo(() => parse(raw), [raw]);

  const update = useCallback(
    (patch: Partial<TranscriptPrefs>) => {
      try {
        localStorage.setItem(KEY, JSON.stringify({ ...prefs, ...patch }));
      } catch {
        // Không lưu được (chế độ riêng tư…) — bỏ qua.
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [prefs],
  );

  return [prefs, update] as const;
}

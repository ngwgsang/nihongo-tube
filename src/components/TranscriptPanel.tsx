"use client";

import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { loadTranslation } from "@/app/actions";
import { useTranscriptPrefs } from "@/lib/transcript-prefs";
import type { Cue, SubtitleLanguage } from "@/lib/youtube/types";
import { TranscriptSettings, type TranslationStatus } from "./TranscriptSettings";

type Status = "loading" | "manual" | "asr" | "none";
type Highlight = readonly { start: number; end: number }[];
type Translation = (string | null)[] | null;

/** Cỡ chữ theo tuỳ chọn: [câu hiện tại, câu khác, ngôn ngữ phụ, chiều cao khung] */
const SIZES = [
  ["text-xl sm:text-2xl", "text-sm", "text-xs", "h-48 sm:h-56"],
  ["text-2xl sm:text-3xl", "text-base", "text-sm", "h-56 sm:h-64"],
  ["text-3xl sm:text-4xl", "text-lg", "text-base", "h-64 sm:h-72"],
  ["text-4xl sm:text-5xl", "text-xl", "text-lg", "h-72 sm:h-80"],
] as const;
type SizeClasses = (typeof SIZES)[number];

const NO_LANGUAGES: SubtitleLanguage[] = [];
const NO_HIGHLIGHT: Highlight = [];

/** Ngôn ngữ phụ dùng thực tế: ưa thích → tiếng Việt → tiếng Anh → cái đầu tiên. */
function pickLanguage(languages: SubtitleLanguage[], preferred: string): string | null {
  for (const code of [preferred, "vi", "en"]) {
    if (languages.some((l) => l.code === code)) return code;
  }
  return languages[0]?.code ?? null;
}

/**
 * Phụ đề kiểu lyrics: toàn bộ câu xếp dọc trong một khung cố định, cả danh sách trượt
 * lên (translateY) để câu đang phát luôn nằm giữa khung. Click câu khác để phát câu đó.
 * Nút ⋯ góc trên bên phải: cỡ chữ và ngôn ngữ phụ (hiện dưới câu đang phát).
 */
export const TranscriptPanel = memo(function TranscriptPanel({
  videoId,
  status,
  cues,
  languages = NO_LANGUAGES,
  activeIndex,
  highlight,
  onSelect,
}: {
  videoId: string;
  status: Status;
  cues: Cue[];
  /** Các ngôn ngữ phụ đề khác tiếng Nhật mà video có */
  languages?: SubtitleLanguage[];
  activeIndex: number;
  /** Các đoạn [start, end) của câu hiện tại cần tô sáng (từ vựng / ngữ pháp đang chọn) */
  highlight: Highlight;
  onSelect: (index: number) => void;
}) {
  const [prefs, setPrefs] = useTranscriptPrefs();
  const sizes = SIZES[prefs.size];
  const lang = pickLanguage(languages, prefs.lang);

  // Phụ đề ngôn ngữ phụ đã tải, theo mã ngôn ngữ (chỉ tải khi cần, mỗi ngôn ngữ một lần).
  const [translations, setTranslations] = useState<Record<string, Translation>>({});
  const requested = useRef(new Set<string>());
  const wanted = prefs.showTranslation ? lang : null;
  useEffect(() => {
    if (!wanted || requested.current.has(wanted)) return;
    requested.current.add(wanted);
    loadTranslation(videoId, wanted)
      .catch(() => null)
      .then((t) => setTranslations((prev) => ({ ...prev, [wanted]: t })));
  }, [videoId, wanted]);
  const translation = wanted ? translations[wanted] : undefined;
  const translationStatus: TranslationStatus = !wanted
    ? "off"
    : translation === undefined
      ? "loading"
      : translation
        ? "ready"
        : "error";

  const frameRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  // Trước câu đầu tiên (activeIndex = -1) vẫn canh giữa câu 0.
  const focus = Math.max(activeIndex, 0);
  const placedRef = useRef(false);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const list = listRef.current;
    if (!frame || !list) return;

    const place = (animate: boolean) => {
      const line = list.children[focus] as HTMLElement | undefined;
      if (!line) return;
      const y = frame.clientHeight / 2 - (line.offsetTop + line.offsetHeight / 2);
      list.style.transitionDuration = animate ? "" : "0s";
      list.style.transform = `translateY(${y}px)`;
    };
    // Đổi câu → trượt; lần hiển thị đầu tiên → đặt thẳng vào vị trí.
    const first = !placedRef.current;
    place(!first);
    placedRef.current = true;

    // Khung đổi cỡ / font tải xong → canh lại ngay, không trượt. (Không theo dõi chiều cao
    // danh sách: nó đổi mỗi khi câu active phóng to, sẽ cắt ngang hiệu ứng trượt.)
    let size = `${frame.clientWidth}x${frame.clientHeight}`;
    const observer = new ResizeObserver(() => {
      const next = `${frame.clientWidth}x${frame.clientHeight}`;
      if (next === size) return;
      size = next;
      place(false);
    });
    observer.observe(frame);
    let alive = true;
    // Font Nhật tải xong làm đổi chiều cao các dòng → canh lại (chỉ lần đầu).
    if (first) document.fonts?.ready.then(() => alive && place(false));
    return () => {
      alive = false;
      observer.disconnect();
    };
  }, [focus, cues, status, sizes, translation, prefs.segmented]);

  if (status === "loading" || status === "none") {
    return (
      <div className="rounded-xl border border-border bg-card px-4 py-6 text-center text-sm text-muted">
        {status === "loading" ? "Đang tải phụ đề…" : "Video này không có phụ đề tiếng Nhật."}
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={frameRef}
        className={`overflow-hidden rounded-xl border border-border bg-card px-4 [mask-image:linear-gradient(transparent,black_22%,black_78%,transparent)] ${sizes[3]}`}
      >
        <ol
          ref={listRef}
          className="flex flex-col items-center gap-3 text-center transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform motion-reduce:duration-0"
        >
          {cues.map((cue, i) => (
            <Line
              key={i}
              cue={cue}
              index={i}
              state={i === activeIndex ? "active" : i < focus ? "past" : "future"}
              highlight={i === activeIndex ? highlight : NO_HIGHLIGHT}
              translation={i === activeIndex ? (translation?.[i] ?? null) : null}
              translationLang={lang}
              sizes={sizes}
              segmented={prefs.segmented}
              onSelect={onSelect}
            />
          ))}
        </ol>
      </div>

      <TranscriptSettings
        prefs={prefs}
        onChange={setPrefs}
        languages={languages}
        lang={lang}
        translationStatus={translationStatus}
      />
    </div>
  );
});

const Line = memo(function Line({
  cue,
  index,
  state,
  highlight,
  translation,
  translationLang,
  sizes,
  segmented,
  onSelect,
}: {
  cue: Cue;
  index: number;
  state: "active" | "past" | "future";
  highlight: Highlight;
  translation: string | null;
  translationLang: string | null;
  sizes: SizeClasses;
  segmented: boolean;
  onSelect: (index: number) => void;
}) {
  if (state === "active") {
    return (
      <li aria-current="true">
        <p lang="ja" className={`font-jp font-medium leading-relaxed text-accent ${sizes[0]}`}>
          <CueText cue={cue} highlight={highlight} segmented={segmented} />
        </p>
        {translation && (
          <p lang={translationLang ?? undefined} className={`mt-1 leading-snug text-foreground/70 ${sizes[2]}`}>
            {translation}
          </p>
        )}
      </li>
    );
  }
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(index)}
        lang="ja"
        className={`cursor-pointer font-jp leading-relaxed text-muted transition-[color,opacity] duration-300 hover:text-foreground hover:opacity-100 ${sizes[1]} ${
          state === "past" ? "opacity-50" : "opacity-80"
        }`}
      >
        {segmented ? <Segmented cue={cue} /> : cue.text}
      </button>
    </li>
  );
});

/** Khoảng trống trước mỗi từ khi bật tách từ (padding để nền tô sáng phủ liền). */
const WORD_GAP = "pl-[0.35em]";

/** Câu khác (không phải câu hiện tại) ở chế độ tách từ. */
function Segmented({ cue }: { cue: Cue }) {
  const breaks = cue.breaks ?? [];
  if (breaks.length === 0) return cue.text;
  const points = [0, ...breaks, cue.text.length];
  return points.slice(0, -1).map((start, i) => (
    <span key={start} className={i > 0 ? WORD_GAP : undefined}>
      {cue.text.slice(start, points[i + 1])}
    </span>
  ));
}

/**
 * Câu hiện tại: gạch chân chấm các từ vựng (rê chuột xem nghĩa) và tô sáng mẫu ngữ pháp
 * đang chọn. Câu được cắt thành các đoạn tại mọi ranh giới từ vựng / tô sáng (và ranh
 * giới từ khi bật tách từ).
 */
function CueText({ cue, highlight, segmented }: { cue: Cue; highlight: Highlight; segmented: boolean }) {
  const { text } = cue;
  const spans = cue.vocabSpans ?? [];
  const breaks = new Set(segmented ? cue.breaks : []);
  if (spans.length === 0 && highlight.length === 0 && breaks.size === 0) return text;

  const cuts = new Set([0, text.length, ...breaks]);
  for (const s of spans) cuts.add(s.start).add(s.end);
  for (const h of highlight) cuts.add(h.start).add(h.end);
  const points = [...cuts].filter((n) => n >= 0 && n <= text.length).sort((a, b) => a - b);

  return points.slice(0, -1).map((start, i) => {
    const end = points[i + 1];
    const piece = text.slice(start, end);
    const span = spans.find((s) => s.start <= start && end <= s.end);
    const marked = highlight.some((h) => h.start <= start && end <= h.end);

    let node: React.ReactNode = piece;
    if (span) {
      const item = cue.vocab?.find((v) => v.word === span.word);
      const tooltip = item ? [item.word + (item.reading ? `（${item.reading}）` : ""), item.meaning].filter(Boolean).join(" — ") : span.word;
      node = (
        <span title={tooltip} className="cursor-help underline decoration-current/50 decoration-dotted decoration-2 underline-offset-[0.3em]">
          {piece}
        </span>
      );
    }
    const gap = breaks.has(start) ? WORD_GAP : "";
    return marked ? (
      <mark key={start} className={`bg-accent text-white ${gap}`}>
        {node}
      </mark>
    ) : (
      <span key={start} className={gap || undefined}>
        {node}
      </span>
    );
  });
}

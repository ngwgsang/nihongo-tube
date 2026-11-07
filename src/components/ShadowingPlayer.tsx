"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDuration } from "@/lib/youtube/parse";
import type { Cue, Transcript } from "@/lib/youtube/types";
import {
  ForwardIcon,
  KeyboardIcon,
  PauseIcon,
  PlayIcon,
  RepeatIcon,
  RewindIcon,
  SkipBackIcon,
  SkipForwardIcon,
} from "./icons";
import { GrammarPanel, VocabPanel } from "./StudyPanels";
import { TranscriptPanel } from "./TranscriptPanel";

/** Lặp một câu: phát đoạn a→b, `remaining` lần nữa (Infinity = lặp mãi). */
type Loop = { a: number; b: number; remaining: number };

const RATES = [0.5, 0.75, 0.9, 1, 1.25];
const REPEAT_OPTIONS = [1, 2, 3, 5, Infinity];
const SEEK_STEP = 2;
const TICK_MS = 100;
const EMPTY_CUES: Cue[] = [];
const EMPTY_VOCAB: NonNullable<Cue["vocab"]> = [];
const EMPTY_GRAMMAR: NonNullable<Cue["grammar"]> = [];
const EMPTY_RANGES: { start: number; end: number }[] = [];

let apiPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  apiPromise ??= new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });
  return apiPromise;
}

/**
 * Tắt phụ đề CC của YouTube (app đã có khung phụ đề riêng). cc_load_policy: 0 không
 * ghi đè được tuỳ chọn "luôn hiện phụ đề" của tài khoản, nên gỡ module captions khi
 * video bắt đầu phát. API không chính thức → bọc try để không làm hỏng player.
 */
function hideYouTubeCaptions(player: YT.Player) {
  try {
    (player as unknown as { unloadModule(name: string): void }).unloadModule("captions");
  } catch {
    // bỏ qua
  }
}

/** Câu cuối cùng có start <= t (binary search), -1 nếu t trước câu đầu. */
function findCueIndex(cues: Cue[], t: number): number {
  let lo = 0;
  let hi = cues.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid].start <= t) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

export function ShadowingPlayer({
  videoId,
  transcript: transcriptPromise,
  children,
}: {
  videoId: string;
  transcript: Promise<Transcript | null>;
  /** Nội dung hiển thị dưới thanh điều khiển (tiêu đề, kênh…). */
  children?: React.ReactNode;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [loop, setLoop] = useState<Loop | null>(null);
  const [repeatTimes, setRepeatTimes] = useState(3);
  const [transcript, setTranscript] = useState<Transcript | null | undefined>(undefined);
  /** Từ vựng / mẫu ngữ pháp đang chọn, gắn với câu cụ thể → tự bỏ khi sang câu khác. */
  const [selection, setSelection] = useState<{ cue: number; kind: "vocab" | "grammar"; id: string } | null>(null);

  // Interval đọc các giá trị này qua ref để không phải tạo lại mỗi lần state đổi.
  const loopRef = useRef<Loop | null>(null);
  const cuesRef = useRef<Cue[]>([]);

  const cues = transcript?.cues ?? EMPTY_CUES;
  const activeIndex = findCueIndex(cues, time);
  const activeCue = cues[activeIndex];
  const current = selection?.cue === activeIndex ? selection : null;
  const selectedGrammar = current?.kind === "grammar" ? current.id : null;
  const selectedWord = current?.kind === "vocab" ? current.id : null;
  // Các đoạn cần tô sáng trong câu hiện tại (mọi lần xuất hiện của từ đang chọn).
  const highlight = useMemo(() => {
    if (selectedGrammar) return activeCue?.grammar?.filter((g) => g.id === selectedGrammar) ?? EMPTY_RANGES;
    if (selectedWord) return activeCue?.vocabSpans?.filter((v) => v.word === selectedWord) ?? EMPTY_RANGES;
    return EMPTY_RANGES;
  }, [activeCue, selectedGrammar, selectedWord]);
  const studyStatus = transcript === undefined ? "loading" : transcript ? "ready" : "none";

  const selectGrammar = useCallback(
    (id: string | null) => setSelection(id ? { cue: activeIndex, kind: "grammar", id } : null),
    [activeIndex],
  );
  const selectWord = useCallback(
    (word: string | null) => setSelection(word ? { cue: activeIndex, kind: "vocab", id: word } : null),
    [activeIndex],
  );

  useEffect(() => {
    let alive = true;
    transcriptPromise.then((t) => {
      if (!alive) return;
      cuesRef.current = t?.cues ?? [];
      setTranscript(t);
    });
    return () => {
      alive = false;
    };
  }, [transcriptPromise]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let player: YT.Player | undefined;

    loadYouTubeApi().then(() => {
      if (cancelled) return;
      // YT.Player thay thế phần tử bằng iframe → dùng phần tử con không do React quản lý.
      const mount = document.createElement("div");
      host.appendChild(mount);
      player = new YT.Player(mount, {
        videoId,
        host: "https://www.youtube-nocookie.com",
        width: "100%",
        height: "100%",
        playerVars: { playsinline: 1, rel: 0, iv_load_policy: 3, cc_load_policy: 0 },
        events: {
          onReady: (e) => {
            playerRef.current = player ?? null;
            setDuration(e.target.getDuration());
            setReady(true);
          },
          onStateChange: (e) => {
            const isPlaying = e.data === YT.PlayerState.PLAYING;
            if (isPlaying) hideYouTubeCaptions(e.target);
            setPlaying(isPlaying);
          },
          onPlaybackRateChange: (e) => setRate(e.data),
        },
      });
    });

    return () => {
      cancelled = true;
      player?.destroy();
      playerRef.current = null;
      host.replaceChildren();
    };
  }, [videoId]);

  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      const t = player.getCurrentTime();
      setTime(t);

      const activeLoop = loopRef.current;
      if (activeLoop && t >= activeLoop.b) {
        if (activeLoop.remaining > 1) {
          activeLoop.remaining -= 1;
          player.seekTo(activeLoop.a, true);
        } else {
          loopRef.current = null;
          setLoop(null);
        }
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [ready]);

  const seek = useCallback((t: number) => {
    const player = playerRef.current;
    if (!player) return;
    const target = Math.max(0, t);
    player.seekTo(target, true);
    setTime(target);
  }, []);

  const setLoopBoth = useCallback((next: Loop | null) => {
    loopRef.current = next;
    setLoop(next);
  }, []);

  const togglePlay = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (player.getPlayerState() === YT.PlayerState.PLAYING) player.pauseVideo();
    else player.playVideo();
  }, []);

  const playCue = useCallback(
    (i: number) => {
      const cue = cuesRef.current[i];
      if (!cue) return;
      seek(cue.start);
      playerRef.current?.playVideo();
    },
    [seek],
  );

  const repeatCue = useCallback(
    (i: number) => {
      const cue = cuesRef.current[i];
      if (!cue) return;
      setLoopBoth({ a: cue.start, b: cue.end, remaining: repeatTimes });
      seek(cue.start);
      playerRef.current?.playVideo();
    },
    [repeatTimes, seek, setLoopBoth],
  );

  const changeRate = (r: number) => {
    playerRef.current?.setPlaybackRate(r);
    setRate(r);
  };


  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]") || e.ctrlKey || e.metaKey || e.altKey) return;
      const player = playerRef.current;
      if (!player) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seek(player.getCurrentTime() - SEEK_STEP);
          break;
        case "ArrowRight":
          e.preventDefault();
          seek(player.getCurrentTime() + SEEK_STEP);
          break;
        case "r":
        case "R": {
          const idx = findCueIndex(cuesRef.current, player.getCurrentTime());
          if (idx >= 0) repeatCue(idx);
          break;
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [repeatCue, seek, togglePlay]);

  const hasCues = cues.length > 0;
  const repeatLabel = Number.isFinite(repeatTimes) ? `×${repeatTimes}` : "×∞";

  const cycleRepeatTimes = () =>
    setRepeatTimes((n) => REPEAT_OPTIONS[(REPEAT_OPTIONS.indexOf(n) + 1) % REPEAT_OPTIONS.length]);

  const toggleRepeatCurrent = () => {
    if (loop) setLoopBoth(null);
    else if (activeIndex >= 0) repeatCue(activeIndex);
  };

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex flex-col gap-3">
        <div ref={hostRef} className="aspect-video w-full overflow-hidden rounded-xl bg-black [&>iframe]:h-full [&>iframe]:w-full" />

        <div className="rounded-xl border border-border bg-card p-2">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <span className="pl-1 font-mono text-xs tabular-nums text-muted">
              {formatDuration(time)}
              {duration > 0 && <span className="opacity-60"> / {formatDuration(duration)}</span>}
            </span>

            <div className="flex items-center gap-1">
              {hasCues && (
                <IconButton label="Câu trước" onClick={() => playCue(Math.max(0, activeIndex - 1))} disabled={!ready}>
                  <SkipBackIcon />
                </IconButton>
              )}
              <IconButton label="Lùi 2 giây (←)" onClick={() => seek(time - SEEK_STEP)} disabled={!ready}>
                <RewindIcon />
              </IconButton>
              <button
                type="button"
                onClick={togglePlay}
                disabled={!ready}
                title={playing ? "Dừng (Space)" : "Phát (Space)"}
                aria-label={playing ? "Dừng" : "Phát"}
                className="mx-1 flex size-11 items-center justify-center rounded-full bg-accent text-lg text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {playing ? <PauseIcon /> : <PlayIcon />}
              </button>
              <IconButton label="Tiến 2 giây (→)" onClick={() => seek(time + SEEK_STEP)} disabled={!ready}>
                <ForwardIcon />
              </IconButton>
              {hasCues && (
                <IconButton label="Câu sau" onClick={() => playCue(activeIndex + 1)} disabled={!ready}>
                  <SkipForwardIcon />
                </IconButton>
              )}
            </div>

            <div className="flex items-center justify-end gap-1">
              {hasCues && (
                <>
                  <IconButton label="Lặp câu hiện tại (R)" onClick={toggleRepeatCurrent} active={loop !== null} disabled={!ready}>
                    <RepeatIcon />
                  </IconButton>
                  <button
                    type="button"
                    onClick={cycleRepeatTimes}
                    title="Số lần lặp mỗi câu"
                    aria-label={`Số lần lặp: ${repeatLabel}`}
                    className="rounded-md px-1 py-1 font-mono text-xs text-muted hover:text-accent"
                  >
                    {repeatLabel}
                  </button>
                </>
              )}
              <select
                value={rate}
                onChange={(e) => changeRate(Number(e.target.value))}
                disabled={!ready}
                title="Tốc độ phát"
                aria-label="Tốc độ phát"
                className="ml-1 rounded-md border border-border bg-card px-2 py-1 font-mono text-xs outline-none hover:border-accent focus:border-accent disabled:opacity-40"
              >
                {RATES.map((r) => (
                  <option key={r} value={r}>
                    {r}x
                  </option>
                ))}
              </select>
              <span
                className="hidden cursor-help p-1.5 text-muted sm:block"
                title={"Phím tắt (bấm ra ngoài video trước):\nSpace — phát/dừng\n← / → — lùi/tiến 2 giây\nR — lặp câu hiện tại"}
                aria-label="Phím tắt: Space phát/dừng, mũi tên trái phải lùi tiến 2 giây, R lặp câu"
              >
                <KeyboardIcon />
              </span>
            </div>
          </div>
        </div>

        <TranscriptPanel
          videoId={videoId}
          languages={transcript?.languages}
          status={transcript === undefined ? "loading" : transcript ? transcript.kind : "none"}
          cues={cues}
          activeIndex={activeIndex}
          highlight={highlight}
          onSelect={playCue}
        />

        {children}
      </div>

      <aside className="grid gap-3 sm:grid-cols-2 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:grid-cols-1 lg:grid-rows-[minmax(0,1fr)_minmax(0,1fr)]">
        <VocabPanel
          status={studyStatus}
          vocab={activeCue?.vocab ?? EMPTY_VOCAB}
          selectedWord={selectedWord}
          onSelect={selectWord}
        />
        <GrammarPanel
          status={studyStatus}
          grammar={activeCue?.grammar ?? EMPTY_GRAMMAR}
          selectedId={selectedGrammar}
          onSelect={selectGrammar}
        />
      </aside>
    </div>
  );
}

function IconButton({
  children,
  label,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`flex size-8 items-center justify-center rounded-md text-base transition-colors disabled:opacity-40 ${
        active ? "bg-accent-soft text-accent" : "text-foreground hover:bg-background hover:text-accent"
      }`}
    >
      {children}
    </button>
  );
}

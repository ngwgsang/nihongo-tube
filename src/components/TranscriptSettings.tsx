"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FONT_SIZES, type TranscriptPrefs } from "@/lib/transcript-prefs";
import type { SubtitleLanguage } from "@/lib/youtube/types";
import { MoreIcon } from "./icons";

export type TranslationStatus = "off" | "loading" | "ready" | "error";

/** Nút ⋯ ở góc trên bên phải khung transcript và popup tuỳ chọn hiển thị. */
export function TranscriptSettings({
  prefs,
  onChange,
  languages,
  lang,
  translationStatus,
}: {
  prefs: TranscriptPrefs;
  onChange: (patch: Partial<TranscriptPrefs>) => void;
  languages: SubtitleLanguage[];
  /** Ngôn ngữ phụ đang dùng thực tế */
  lang: string | null;
  translationStatus: TranslationStatus;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const id = useId();

  // Đóng khi bấm ra ngoài hoặc nhấn Esc.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    // Bấm vào iframe video không tạo pointerdown ở trang, nhưng làm cửa sổ mất focus.
    const onBlur = () => setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", onBlur);
    };
  }, [open]);

  const hasLanguages = languages.length > 0;

  return (
    <div ref={rootRef} className="absolute right-2 top-2 z-10">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Tuỳ chọn hiển thị"
        aria-expanded={open}
        aria-controls={id}
        className={`grid size-8 cursor-pointer place-items-center rounded-lg transition-colors hover:bg-background hover:text-foreground ${
          open ? "bg-background text-foreground" : "text-muted"
        }`}
      >
        <MoreIcon />
      </button>

      {open && (
        <div
          id={id}
          role="dialog"
          aria-label="Tuỳ chọn hiển thị"
          className="absolute right-0 top-10 w-64 space-y-4 rounded-xl border border-border bg-card p-3 text-sm shadow-xl shadow-black/30"
        >
          <fieldset>
            <legend className="mb-1.5 text-xs font-medium text-muted">Cỡ chữ</legend>
            <div className="grid grid-cols-4 gap-1 rounded-lg bg-background p-1">
              {FONT_SIZES.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => onChange({ size: i })}
                  aria-pressed={prefs.size === i}
                  title={label}
                  className={`cursor-pointer rounded-md py-1 font-jp transition-colors ${
                    prefs.size === i ? "bg-accent text-white" : "text-muted hover:text-foreground"
                  }`}
                  style={{ fontSize: `${0.75 + i * 0.125}rem` }}
                >
                  あ
                </button>
              ))}
            </div>
          </fieldset>

          <Switch
            label="Tách từ"
            checked={prefs.segmented}
            onChange={(segmented) => onChange({ segmented })}
          />

          <div>
            <Switch
              label="Ngôn ngữ phụ"
              checked={prefs.showTranslation}
              onChange={(showTranslation) => onChange({ showTranslation })}
              disabled={!hasLanguages}
            />

            {hasLanguages ? (
              <select
                value={lang ?? ""}
                onChange={(e) => onChange({ lang: e.target.value, showTranslation: true })}
                disabled={!prefs.showTranslation}
                aria-label="Chọn ngôn ngữ phụ"
                className="mt-2 w-full cursor-pointer rounded-lg border border-border bg-background px-2 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="mt-1 text-xs text-muted">Video không có phụ đề ngôn ngữ khác.</p>
            )}

            {translationStatus === "loading" && <p className="mt-1.5 text-xs text-muted">Đang tải phụ đề…</p>}
            {translationStatus === "error" && <p className="mt-1.5 text-xs text-accent">Không tải được phụ đề này.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

/** Công tắc bật/tắt (checkbox ẩn + thanh trượt). */
function Switch({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span>{label}</span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="relative h-5 w-9 shrink-0 rounded-full bg-border transition-colors peer-checked:bg-accent peer-disabled:opacity-40 peer-focus-visible:ring-2 peer-focus-visible:ring-accent/50 after:absolute after:left-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4"
      />
    </label>
  );
}

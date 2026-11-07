"use client";

import { memo } from "react";
import type { GrammarMatch, VocabItem } from "@/lib/youtube/types";

type Status = "loading" | "ready" | "none";

function Panel({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
      <h2 className="flex items-center justify-between border-b border-border px-3 py-2 text-sm font-semibold">
        {title}
        {count ? <span className="font-mono text-xs font-normal text-muted">{count}</span> : null}
      </h2>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </section>
  );
}

function Empty({ status, text }: { status: Status; text: string }) {
  return (
    <p className="px-3 py-4 text-center text-xs text-muted">
      {status === "loading" ? "Đang tải…" : status === "none" ? "Không có phụ đề để phân tích." : text}
    </p>
  );
}

/** Nút một mục trong panel: bấm để tô sáng trong transcript, bấm lại để bỏ. */
function ItemButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      title={selected ? "Bỏ tô sáng" : "Tô sáng trong câu"}
      className={`w-full cursor-pointer rounded-lg px-2.5 py-2 text-left transition-colors ${
        selected ? "bg-accent-soft" : "hover:bg-background"
      }`}
    >
      {children}
    </button>
  );
}

export const VocabPanel = memo(function VocabPanel({
  status,
  vocab,
  selectedWord,
  onSelect,
}: {
  status: Status;
  vocab: VocabItem[];
  selectedWord: string | null;
  onSelect: (word: string | null) => void;
}) {
  return (
    <Panel title="Từ vựng" count={vocab.length}>
      {vocab.length === 0 ? (
        <Empty status={status} text="Câu này không có từ mới." />
      ) : (
        <ul className="flex flex-col gap-1 p-1">
          {vocab.map((v) => {
            const selected = v.word === selectedWord;
            return (
              <li key={v.word}>
                <ItemButton selected={selected} onClick={() => onSelect(selected ? null : v.word)}>
                  <span className="flex items-baseline gap-2">
                    <span lang="ja" className={`font-jp text-base font-medium ${selected ? "text-accent" : ""}`}>
                      {v.word}
                    </span>
                    {v.reading && (
                      <span lang="ja" className="font-jp text-xs text-muted">
                        {v.reading}
                      </span>
                    )}
                  </span>
                  {v.meaning && <span className="mt-0.5 line-clamp-2 block text-xs text-muted">{v.meaning}</span>}
                </ItemButton>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
});

export const GrammarPanel = memo(function GrammarPanel({
  status,
  grammar,
  selectedId,
  onSelect,
}: {
  status: Status;
  grammar: GrammarMatch[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <Panel title="Ngữ pháp" count={grammar.length}>
      {grammar.length === 0 ? (
        <Empty status={status} text="Không nhận ra mẫu ngữ pháp nào." />
      ) : (
        <ul className="flex flex-col gap-1 p-1">
          {grammar.map((g) => {
            const selected = g.id === selectedId;
            return (
              <li key={g.id}>
                <ItemButton selected={selected} onClick={() => onSelect(selected ? null : g.id)}>
                  <span className="flex items-center justify-between gap-2">
                    <span lang="ja" className={`font-jp text-sm font-medium ${selected ? "text-accent" : ""}`}>
                      {g.pattern}
                    </span>
                    <span className="shrink-0 rounded bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted">
                      {g.level}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">{g.meaning}</span>
                </ItemButton>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
});

"use client";

import { useState, useTransition } from "react";
import { loadMoreFeed } from "@/app/actions";
import type { FeedSource } from "@/lib/feed";
import type { ApiError, Cursor } from "@/lib/youtube/api";
import type { Video } from "@/lib/youtube/types";
import { ErrorNotice } from "./ErrorNotice";
import { VideoGrid } from "./VideoGrid";

export function FeedList({
  source,
  initialVideos,
  initialCursor,
  empty,
}: {
  source: FeedSource;
  initialVideos: Video[];
  initialCursor: Cursor | null;
  empty: string;
}) {
  const [videos, setVideos] = useState(initialVideos);
  const [cursor, setCursor] = useState(initialCursor);
  const [error, setError] = useState<ApiError | null>(null);
  const [pending, startTransition] = useTransition();

  function loadMore() {
    if (!cursor) return;
    startTransition(async () => {
      const result = await loadMoreFeed(source, cursor);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setVideos((prev) => {
        const seen = new Set(prev.map((v) => v.id));
        return [...prev, ...result.data.videos.filter((v) => !seen.has(v.id))];
      });
      setCursor(result.data.cursor);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <VideoGrid videos={videos} empty={empty} />
      {error && <ErrorNotice error={error} />}
      {cursor ? (
        <button
          type="button"
          onClick={loadMore}
          disabled={pending}
          aria-label={pending ? "Đang tải" : "Tải thêm"}
          title="Tải thêm"
          className="group mx-auto flex size-12 items-center justify-center rounded-full border border-border bg-card text-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-wait"
        >
          {pending ? (
            <span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-5 animate-pulse group-hover:[animation-duration:1s]"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          )}
        </button>
      ) : (
        videos.length > 0 && <p className="text-center text-sm text-muted">Đã hết video.</p>
      )}
    </div>
  );
}

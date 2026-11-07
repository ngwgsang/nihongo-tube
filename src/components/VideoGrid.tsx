import type { Video } from "@/lib/youtube/types";
import { VideoCard } from "./VideoCard";

const GRID = "grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-4";

export function VideoGrid({ videos, empty }: { videos: Video[]; empty: string }) {
  if (videos.length === 0) {
    return <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted">{empty}</p>;
  }
  return (
    <div className={GRID}>
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  );
}

export function VideoGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className={GRID} aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex animate-pulse flex-col gap-2 p-1">
          <div className="aspect-video rounded-lg bg-border" />
          <div className="h-4 w-4/5 rounded bg-border" />
          <div className="h-3 w-1/2 rounded bg-border" />
        </div>
      ))}
    </div>
  );
}

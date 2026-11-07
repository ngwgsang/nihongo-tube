import Image from "next/image";
import Link from "next/link";
import { formatDuration } from "@/lib/youtube/parse";
import type { Video } from "@/lib/youtube/types";

export function VideoCard({ video }: { video: Video }) {
  return (
    <Link
      href={`/watch/${video.id}`}
      className="group flex flex-col gap-2 rounded-xl p-1 transition-colors hover:bg-card"
    >
      <div className="relative aspect-video overflow-hidden rounded-lg bg-border">
        <Image
          src={video.thumbnail}
          alt=""
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform group-hover:scale-105"
        />
        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 font-mono text-xs text-white">
          {formatDuration(video.durationSec)}
        </span>
      </div>
      <div className="px-1">
        <h3 lang="ja" className="line-clamp-2 font-jp text-sm font-medium leading-snug">
          {video.title}
        </h3>
        <p className="mt-1 text-xs text-muted">
          {video.channelTitle} · {new Date(video.publishedAt).toLocaleDateString("vi-VN")}
        </p>
      </div>
    </Link>
  );
}

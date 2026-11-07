import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ErrorNotice } from "@/components/ErrorNotice";
import { ShadowingPlayer } from "@/components/ShadowingPlayer";
import { getJapaneseTranscript } from "@/lib/transcript";
import { getVideo } from "@/lib/youtube/api";
import { isJapanese } from "@/lib/youtube/filter";
import { VIDEO_ID_RE } from "@/lib/youtube/parse";

export default function WatchPage({ params }: PageProps<"/watch/[id]">) {
  return (
    <main>
      <Suspense fallback={<div className="aspect-video w-full animate-pulse rounded-xl bg-border lg:w-2/3" />}>
        <Watch params={params} />
      </Suspense>
    </main>
  );
}

async function Watch({ params }: Pick<PageProps<"/watch/[id]">, "params">) {
  const { id } = await params;
  if (!VIDEO_ID_RE.test(id)) notFound();

  const result = await getVideo(id);
  if (!result.ok) return <ErrorNotice error={result.error} />;
  const video = result.data;
  if (!video) notFound();

  if (!isJapanese(video)) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6">
        <h1 className="font-semibold">Video này không phải tiếng Nhật</h1>
        <p className="text-sm text-muted">
          “{video.title}” — ngôn ngữ khai báo: {video.audioLanguage ?? video.defaultLanguage ?? "không rõ"}.
        </p>
        <Link href="/" className="text-sm text-accent hover:underline">
          ← Về trang chủ
        </Link>
      </div>
    );
  }

  // Không await: player hiện ngay, phụ đề tải sau. Lỗi phụ đề → coi như không có.
  const transcript = getJapaneseTranscript(id).catch(() => null);

  return (
    <ShadowingPlayer key={video.id} videoId={video.id} transcript={transcript}>
      <div className="px-1">
        <h1 lang="ja" className="font-jp text-lg font-semibold leading-snug">
          {video.title}
        </h1>
        <p className="mt-1 text-sm text-muted">{video.channelTitle}</p>
      </div>
    </ShadowingPlayer>
  );
}

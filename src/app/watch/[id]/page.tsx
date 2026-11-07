import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ErrorNotice } from "@/components/ErrorNotice";
import { ShadowingPlayer } from "@/components/ShadowingPlayer";
import { getJapaneseTranscript } from "@/lib/transcript";
import { getVideo } from "@/lib/youtube/api";
import { isJapanese } from "@/lib/youtube/filter";
import { VIDEO_ID_RE } from "@/lib/youtube/parse";

export default function WatchPage({ params, searchParams }: PageProps<"/watch/[id]">) {
  return (
    <main>
      <Suspense fallback={<div className="aspect-video w-full animate-pulse rounded-xl bg-border lg:w-2/3" />}>
        <Watch params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Watch({ params, searchParams }: PageProps<"/watch/[id]">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!VIDEO_ID_RE.test(id)) notFound();

  const result = await getVideo(id);
  if (!result.ok) return <ErrorNotice error={result.error} />;
  const video = result.data;
  if (!video) notFound();

  // Video không phải tiếng Nhật: cảnh báo trước, bấm "Vẫn xem" (?xem=1) để mở player.
  if (!isJapanese(video) && query.xem !== "1") {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6">
        <h1 className="font-semibold">Video này có vẻ không phải tiếng Nhật</h1>
        <p className="text-sm text-muted">
          “{video.title}” — ngôn ngữ khai báo: {video.audioLanguage ?? video.defaultLanguage ?? "không rõ"}. Phụ đề,
          từ vựng và ngữ pháp có thể không có.
        </p>
        <div className="flex items-center gap-4 text-sm">
          <Link
            href={`/watch/${video.id}?xem=1`}
            className="rounded-lg bg-accent px-4 py-2 font-medium text-white transition-opacity hover:opacity-90"
          >
            Vẫn xem
          </Link>
          <Link href="/" className="text-muted hover:text-foreground">
            ← Về trang chủ
          </Link>
        </div>
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

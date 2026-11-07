import { Suspense } from "react";
import { Feed } from "@/components/Feed";
import { PasteLinkBox } from "@/components/PasteLinkBox";
import { SearchBox } from "@/components/SearchBox";
import { TopicTabs } from "@/components/TopicTabs";
import { VideoGridSkeleton } from "@/components/VideoGrid";
import { findTopic } from "@/config/topics";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="flex flex-col gap-6">
      <section className="grid gap-3 md:grid-cols-2">
        <SearchBox />
        <PasteLinkBox />
      </section>

      <Suspense fallback={<VideoGridSkeleton />}>
        <TopicFeed searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function TopicFeed({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const { topic: slug } = await searchParams;
  const topic = findTopic(typeof slug === "string" ? slug : undefined);

  return (
    <section className="flex flex-col gap-4">
      <TopicTabs active={topic?.slug} />
      <h2 className="text-lg font-semibold">{topic ? topic.label : "Video mới từ kênh tuyển chọn"}</h2>
      <Suspense key={topic?.slug ?? "curated"} fallback={<VideoGridSkeleton />}>
        <Feed
          source={topic ? { kind: "topic", slug: topic.slug } : { kind: "curated" }}
          empty="Chưa có video tiếng Nhật nào cho mục này."
        />
      </Suspense>
    </section>
  );
}

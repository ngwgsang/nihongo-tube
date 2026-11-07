import { Suspense } from "react";
import { Feed } from "@/components/Feed";
import { SearchBox } from "@/components/SearchBox";
import { VideoGridSkeleton } from "@/components/VideoGrid";

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <main className="flex flex-col gap-6">
      <Suspense fallback={<VideoGridSkeleton />}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function SearchResults({ searchParams }: Pick<PageProps<"/search">, "searchParams">) {
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q)?.trim() ?? "";

  return (
    <>
      <SearchBox key={query} defaultValue={query} />
      {query ? (
        <Results query={query} />
      ) : (
        <p className="text-muted">Nhập từ khoá để tìm video tiếng Nhật.</p>
      )}
    </>
  );
}

function Results({ query }: { query: string }) {
  return (
    <>
      <h2 className="text-lg font-semibold">
        Kết quả tiếng Nhật cho “<span lang="ja">{query}</span>”
      </h2>
      <Suspense key={query} fallback={<VideoGridSkeleton />}>
        <Feed source={{ kind: "query", q: query }} empty="Không tìm thấy video tiếng Nhật phù hợp." />
      </Suspense>
    </>
  );
}

import { loadFeed, type FeedSource } from "@/lib/feed";
import { ErrorNotice } from "./ErrorNotice";
import { FeedList } from "./FeedList";

/** Tải trang đầu ở server, các trang sau do FeedList gọi qua server action. */
export async function Feed({ source, empty }: { source: FeedSource; empty: string }) {
  const result = await loadFeed(source);
  if (!result.ok) return <ErrorNotice error={result.error} />;
  return (
    <FeedList source={source} initialVideos={result.data.videos} initialCursor={result.data.cursor} empty={empty} />
  );
}

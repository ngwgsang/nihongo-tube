import type { SearchOptions } from "@/lib/youtube/api";

/**
 * Chủ đề trên trang chủ. Mỗi chủ đề là một truy vấn tìm kiếm tiếng Nhật
 * (dấu | = HOẶC), có thể kèm videoCategoryId của YouTube cho chính xác hơn.
 * Mỗi trang của một chủ đề tốn ~100 unit quota (được cache vài giờ).
 */
export type Topic = { slug: string; label: string; search: SearchOptions };

export const TOPICS: Topic[] = [
  { slug: "tin-tuc", label: "Tin tức", search: { q: "ニュース", categoryId: "25", order: "date" } },
  { slug: "cong-nghe", label: "Công nghệ", search: { q: "テクノロジー|ガジェット|IT|AI", categoryId: "28" } },
  { slug: "phong-van", label: "Phỏng vấn", search: { q: "インタビュー|対談" } },
  { slug: "podcast", label: "Podcast", search: { q: "ポッドキャスト|ラジオ|雑談" } },
  { slug: "hoc-tieng-nhat", label: "Học tiếng Nhật", search: { q: "日本語 聞き取り|日本語 リスニング|やさしい日本語" } },
  { slug: "doi-song", label: "Đời sống", search: { q: "日本 暮らし|日常 vlog" } },
  { slug: "kinh-doanh", label: "Kinh doanh", search: { q: "ビジネス|経済|起業" } },
  { slug: "nau-an", label: "Nấu ăn", search: { q: "料理|レシピ", categoryId: "26" } },
  { slug: "du-lich", label: "Du lịch", search: { q: "旅行|観光", categoryId: "19" } },
  { slug: "giai-tri", label: "Giải trí", search: { q: "バラエティ|お笑い|コント", categoryId: "24" } },
];

export function findTopic(slug: string | undefined): Topic | undefined {
  return TOPICS.find((t) => t.slug === slug);
}

# NihongoTube (日本語TUBE)

Luyện nghe & shadowing tiếng Nhật với video YouTube (embed, không tải về). Chỉ giữ video tiếng Nhật.

## Cài đặt

1. Tạo API key YouTube Data API v3 tại Google Cloud Console (bật "YouTube Data API v3", nên giới hạn key chỉ cho API này).
2. Tạo `.env.local`:
   ```
   YOUTUBE_API_KEY=...
   ```
3. `npm run dev` → http://localhost:3000

## Tính năng

- Trang chủ: video mới từ các kênh tuyển chọn — sửa danh sách trong `src/config/channels.ts`.
- Tab chủ đề (Tin tức, Công nghệ, Phỏng vấn, Podcast…) — mỗi chủ đề là một truy vấn tìm kiếm tiếng Nhật, sửa trong `src/config/topics.ts`.
- Nút "Tải thêm" ở cuối danh sách (kênh tuyển chọn, chủ đề, kết quả tìm kiếm).
- Tìm kiếm (100 unit quota/lần, kể cả mỗi lần tải thêm) và dán link YouTube.
- Lọc tiếng Nhật: `defaultAudioLanguage`/`defaultLanguage` = `ja`, nếu không khai báo thì dựa vào kana trong tiêu đề (`src/lib/youtube/filter.ts`).
- Trang shadowing: tốc độ, phụ đề tiếng Nhật theo thời gian, click câu để nhảy, lặp câu N lần.
  Phím tắt: Space, ←/→ (±2s), R (lặp câu hiện tại).

- Khung Từ vựng & Ngữ pháp theo câu đang phát: tách từ bằng kuromoji (IPADIC), nghĩa tiếng Anh từ JMdict,
  ~75 mẫu ngữ pháp N5–N3 nhận diện bằng luật (`src/lib/japanese/grammar.ts`); click mẫu ngữ pháp để tô sáng trong câu.

### Từ điển

`data/jmdict.json.gz` được tạo từ JMdict bản đầy đủ (tiếng Anh) của
[jmdict-simplified](https://github.com/scriptin/jmdict-simplified): tải `jmdict-eng-*.json` rồi chạy
`node scripts/build-dict.mjs <file.json>` (khoảng 466.000 mục; trùng cách viết thì ưu tiên từ thông dụng).
JMdict © [EDRDG](https://www.edrdg.org/), giấy phép CC BY-SA 4.0.

Phụ đề lấy qua endpoint không chính thức của YouTube (`src/lib/transcript.ts`) — có thể hỏng nếu YouTube thay đổi; khi đó trang vẫn xem được video nhưng không có phụ đề.
API key chỉ dùng ở server. Kết quả API được cache bằng `"use cache"` (vài giờ), lỗi chỉ cache vài giây.

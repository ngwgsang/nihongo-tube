/**
 * Kênh tiếng Nhật tuyển chọn hiển thị ở trang chủ.
 * Thêm/bớt tuỳ ý — mỗi kênh tốn ~1 unit quota mỗi lần làm mới (cache vài giờ).
 * Lấy channel ID: mở trang kênh → View page source → tìm "externalId".
 */
export const CURATED_CHANNELS: { id: string; name: string }[] = [
  { id: "UCCyQwSS6m2mVB0-H2FOFJtw", name: "YUYU NIHONGO" },
  { id: "UCH88l3_ltyJm67gAFzDFNRw", name: "Teppei" },
  { id: "UCLyqJHv178KquzB-oWPp7RA", name: "Slow Japanese with M sensei" },
  { id: "UCLuymDHiOySsAQ9Nc-4NoEQ", name: "Onomappu" },
  { id: "UCu6sZrHyl4hSS2PvlUo2XZA", name: "Japanese with Shun" },
  { id: "UCGCZAYq5Xxojl_tSXcVJhiQ", name: "ANNnewsCH" },
  { id: "UCip8ve30-AoX2y2OtAAmqFA", name: "NHK" },
];

/** Số video mới nhất lấy từ mỗi kênh. */
export const VIDEOS_PER_CHANNEL = 8;

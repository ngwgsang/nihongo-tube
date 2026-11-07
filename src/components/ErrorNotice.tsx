import type { ApiError } from "@/lib/youtube/api";

function describe(error: ApiError): string {
  switch (error.reason) {
    case "missingKey":
      return "Chưa có YOUTUBE_API_KEY. Tạo file .env.local với YOUTUBE_API_KEY=... rồi khởi động lại server.";
    case "quotaExceeded":
    case "dailyLimitExceeded":
      return "Đã hết quota YouTube API trong ngày (10.000 unit). Quota sẽ reset lúc 0h giờ Thái Bình Dương.";
    case "keyInvalid":
    case "badRequest":
      return `API key không hợp lệ hoặc yêu cầu sai: ${error.message}`;
    case "accessNotConfigured":
      return "YouTube Data API v3 chưa được bật cho project của API key này.";
  }
  return error.status
    ? `YouTube API lỗi (${error.status}): ${error.message}`
    : `Không tải được dữ liệu từ YouTube: ${error.message}`;
}

export function ErrorNotice({ error }: { error: ApiError }) {
  return (
    <div role="alert" className="rounded-xl border border-accent/40 bg-accent-soft p-4 text-sm">
      {describe(error)}
    </div>
  );
}

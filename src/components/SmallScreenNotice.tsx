/**
 * Màn hình nhỏ hơn 768px (điện thoại): layout ẩn toàn bộ app và chỉ hiện thông báo này.
 * Chỉ dùng CSS (md:hidden) nên hiện ngay, không nhấp nháy; mở trên máy lớn hơn là app hiện lại.
 */
export function SmallScreenNotice() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-8 py-10 text-center md:hidden">
      <p className="text-2xl font-bold tracking-tight">
        <span className="font-jp">日本語</span>
        <span className="text-accent">TUBE</span>
      </p>

      <Illustration />

      <div className="max-w-xs space-y-2">
        <h1 className="text-lg font-semibold">Chưa hỗ trợ màn hình nhỏ</h1>
        <p className="text-sm leading-relaxed text-muted">
          Website không khả dụng trên điện thoại. Vui lòng sử dụng laptop hoặc PC để có trải nghiệm tốt hơn.
        </p>
      </div>
    </div>
  );
}

/** Laptop đang phát video kèm phụ đề tiếng Nhật, bên cạnh là điện thoại bị gạch chéo. */
function Illustration() {
  return (
    <svg viewBox="0 0 280 170" aria-hidden="true" className="w-64 max-w-full" fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* Bóng nền */}
      <ellipse cx="150" cy="156" rx="118" ry="8" className="fill-border" />

      {/* Laptop */}
      <rect x="74" y="14" width="176" height="114" rx="9" strokeWidth="3" className="fill-card stroke-muted" />
      <rect x="86" y="26" width="152" height="64" rx="5" className="fill-border" />
      <circle cx="162" cy="58" r="15" className="fill-accent" />
      <path d="M157 50.5v15l12-7.5z" className="fill-white" />
      {/* Thanh tiến trình */}
      <path d="M92 84h140" strokeWidth="2" className="stroke-muted/40" />
      <path d="M92 84h52" strokeWidth="2" className="stroke-accent" />
      {/* Phụ đề: câu tiếng Nhật + dòng dịch */}
      <text x="162" y="107" textAnchor="middle" fontSize="11" fontWeight="600" className="fill-accent font-jp">
        日本語を聞こう
      </text>
      <path d="M128 117h68" strokeWidth="3" className="stroke-muted/50" />
      {/* Đế laptop */}
      <path d="M58 136h208l-8 10H66z" strokeWidth="3" className="fill-card stroke-muted" />
      <path d="M146 136v3h32v-3" strokeWidth="2" className="stroke-muted" />

      {/* Điện thoại */}
      <rect x="18" y="64" width="44" height="80" rx="8" strokeWidth="3" className="fill-card stroke-muted" />
      <rect x="25" y="74" width="30" height="56" rx="3" className="fill-border" />
      <path d="M35 137h10" strokeWidth="2.5" className="stroke-muted" />

      {/* Dấu gạch chéo trên điện thoại */}
      <circle cx="58" cy="66" r="13" strokeWidth="3" className="fill-accent stroke-background" />
      <path d="M53 61l10 10M63 61l-10 10" strokeWidth="2.5" className="stroke-white" />

      {/* Dấu tích trên laptop */}
      <circle cx="248" cy="18" r="13" strokeWidth="3" className="fill-foreground stroke-background" />
      <path d="M242.5 18.5l3.5 3.5 7-7.5" strokeWidth="2.5" className="stroke-background" />
    </svg>
  );
}

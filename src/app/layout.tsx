import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono, Noto_Sans_JP } from "next/font/google";
import { SmallScreenNotice } from "@/components/SmallScreenNotice";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-jp",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: "日本語TUBE",
  description: "Luyện nghe và shadowing tiếng Nhật với video YouTube",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSansJp.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <SmallScreenNotice />
        <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur max-md:hidden">
          <div className="mx-auto flex h-14 max-w-6xl items-center px-4">
            <Link href="/" aria-label="NihongoTube — trang chủ" className="flex items-baseline text-lg font-bold tracking-tight">
              <span className="font-jp">日本語</span>
              <span className="text-accent">TUBE</span>
            </Link>
          </div>
        </header>
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 max-md:hidden">{children}</div>
      </body>
    </html>
  );
}


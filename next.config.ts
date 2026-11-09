import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // kuromoji đọc từ điển bằng fs theo đường dẫn → chạy bằng require của Node, không bundle.
  serverExternalPackages: ["kuromoji"],
  // Hai file này đọc bằng fs theo đường dẫn động nên trace không tự thấy → khai báo để Vercel đóng gói kèm.
  outputFileTracingIncludes: {
    "/*": ["./data/jmdict.json.gz", "./node_modules/kuromoji/dict/**/*"],
  },
  images: {
    remotePatterns: [new URL("https://i.ytimg.com/vi/**")],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

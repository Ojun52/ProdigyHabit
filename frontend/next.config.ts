import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Cloudflare Pages (無料枠) 用の静的エクスポート設定
  output: "export",

  // 2. 画像最適化サーバーを使わない設定 (必須)
  images: {
    unoptimized: true,
  },

  // 3. Reactの厳密モード (任意)
  reactStrictMode: true,
};

export default nextConfig;
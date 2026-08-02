import type { NextConfig } from "next";

const nextConfig = {
  allowedDevOrigins: [
    // 本機開發（localhost / 迴環位址）— 缺這兩者時 Next 16 會擋 /_next/webpack-hmr
    // 與客戶端 runtime chunk，導致頁面無法 hydrate、按鈕點了沒反應。
    'localhost',
    'localhost:3000',
    '127.0.0.1',
    '127.0.0.1:3000',
    '192.168.0.105:3000',
    '192.168.0.105',
    '172.20.10.3:3000',
    '172.20.10.3',
    '192.168.0.181',
    '192.168.0.181:3000',
    '192.168.0.136',
    '192.168.0.136:3000',
  ],
  outputFileTracingRoot: __dirname,
};


export default nextConfig;




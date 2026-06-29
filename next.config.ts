import type { NextConfig } from "next";

const nextConfig = {
  // 加上這一行，允許你用手機或區網 IP 瀏覽開發中的網頁
  allowedDevOrigins: ['192.168.0.105:3000', '192.168.0.105'],
};


export default nextConfig;




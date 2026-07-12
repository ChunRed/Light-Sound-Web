import type { NextConfig } from "next";

const nextConfig = {
  allowedDevOrigins: [
    '192.168.0.105:3000',
    '192.168.0.105',
    '172.20.10.3:3000',
    '172.20.10.3',
    '192.168.0.181',
    '192.168.0.181:3000',
  ],
  outputFileTracingRoot: __dirname,
};


export default nextConfig;




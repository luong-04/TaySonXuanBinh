import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  output: 'export', // Bắt buộc để build ra file tĩnh cho Electron
  images: { unoptimized: true } // Bắt buộc vì Electron không có Image Optimization server
}

export default nextConfig;

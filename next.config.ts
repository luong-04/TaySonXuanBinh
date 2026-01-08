import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  //output: 'export', // Bắt buộc để xuất file .exe
  images: { unoptimized: true }, // Để hiện ảnh trong .exe
  
  // --- PHẦN MỚI THÊM: CẤU HÌNH API ĐỂ NHẬN LỆNH TỪ APP EXE ---
  /*async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" }, // Cho phép tất cả nguồn (bao gồm file:// của exe)
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ]
      }
    ]
  }*/
};

export default nextConfig;
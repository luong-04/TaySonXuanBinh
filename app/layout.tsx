import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google"; 
import "./globals.css";

const vietnamPro = Be_Vietnam_Pro({
  subsets: ["vietnamese"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-vietnam-pro",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Môn Phái Tây Sơn Xuân Bình",
  description: "Hệ thống quản lý môn phái",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      {/* 👇 QUAN TRỌNG: Phải thêm cả .variable vào đây thì CSS mới nhận font */}
      <body className={`${vietnamPro.variable} ${vietnamPro.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}

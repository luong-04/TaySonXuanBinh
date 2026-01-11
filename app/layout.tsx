import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tây Sơn Xuân Bình",
  description: "Cổng thông tin môn phái",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <head>
        <meta name="theme-color" content="#da251d" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      {/* THÊM class 'overflow-hidden' VÀO DÒNG DƯỚI ĐÂY */}
      <body className="antialiased overflow-hidden h-screen w-screen bg-stone-50">
        {children}
      </body>
    </html>
  );
}
import type { Metadata } from "next";
import Script from "next/script"; // Import Script của Next.js
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
      <body className="antialiased">
        {/* --- BẮT ĐẦU ĐOẠN MÃ ONESIGNAL --- */}
        <Script 
          src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" 
          strategy="afterInteractive" 
        />
        <Script id="onesignal-init" strategy="afterInteractive">
          {`
            window.OneSignalDeferred = window.OneSignalDeferred || [];
            OneSignalDeferred.push(async function(OneSignal) {
              await OneSignal.init({
                appId: "5343bb1a-48b3-427a-a4cd-6b7080c55191", // App ID của bạn
                safari_web_id: "web.onesignal.auto.47d572d6-ef9d-4d9d-8962-815db43f4beb",
                notifyButton: {
                  enable: true,
                },
                allowLocalhostAsSecureOrigin: true,
                // Tự động hỏi quyền khi vào web
                promptOptions: {
                  slidedown: {
                    prompts: [
                      {
                        type: "push",
                        autoPrompt: true,
                        text: {
                          actionMessage: "Nhận thông báo mới nhất từ Môn Phái?",
                          acceptButton: "Đồng ý",
                          cancelButton: "Để sau"
                        }
                      }
                    ]
                  }
                }
              });
            });
          `}
        </Script>
        {/* --- KẾT THÚC ĐOẠN MÃ ONESIGNAL --- */}

        {children}
      </body>
    </html>
  );
}
'use client';
import { useEffect } from 'react';
import OneSignal from 'react-onesignal';

export default function OneSignalInit() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const runOneSignal = async () => {
        try {
          await OneSignal.init({
            appId: "5343bb1a-48b3-427a-a4cd-6b7080c55191",
            safari_web_id: "web.onesignal.auto.47d572d6-ef9d-4d9d-8962-815db43f4beb",
            allowLocalhostAsSecureOrigin: true, // Cho phép chạy trên localhost
            // Sửa lỗi: Thêm 'as any' để bỏ qua kiểm tra strict type
            notifyButton: {
              enable: true,
            } as any, 
          });
          
          // Tự động hiện bảng xin quyền khi vào web
          OneSignal.Slidedown.promptPush();
        } catch (error) {
          console.log('OneSignal init error:', error);
        }
      };
      runOneSignal();
    }
  }, []);

  return null;
}
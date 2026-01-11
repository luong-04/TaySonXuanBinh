import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, heading } = await req.json();

    // Gọi sang OneSignal để nhờ họ bắn tin đi
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // --- SỬA DÒNG NÀY: Thêm chữ 'Basic ' vào trước mã Key ---
        'Authorization': `Basic os_v2_app_knb3wgsiwnbhvjgnnnyibrkrsgqcdbtznhhee6v2gzlrd3x6q7v5vdxinh7frdex5nbkybxyd2su7ncijrmui3dqda3wf3ybyie5hei`, 
      },
      body: JSON.stringify({
        app_id: "5343bb1a-48b3-427a-a4cd-6b7080c55191", // App ID của bạn
        included_segments: ["Total Subscriptions"], // Gửi cho tất cả mọi người
        headings: { en: heading || "Thông báo môn phái" },
        contents: { en: message },
        // Link này OK
        url: "https://tay-son-xuan-binh.vercel.app/" 
      }),
    });

    const data = await response.json();
    
    // Log ra để kiểm tra xem OneSignal trả về gì (nếu cần debug trên Vercel logs)
    console.log("OneSignal Response:", data);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
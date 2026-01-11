import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, heading } = await req.json();

    // Gọi sang OneSignal để nhờ họ bắn tin đi
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Lấy API Key trong OneSignal -> Settings -> Keys & IDs
        'Authorization': `os_v2_app_knb3wgsiwnbhvjgnnnyibrkrsgqcdbtznhhee6v2gzlrd3x6q7v5vdxinh7frdex5nbkybxyd2su7ncijrmui3dqda3wf3ybyie5hei`, 
      },
      body: JSON.stringify({
        app_id: "YOUR_ONESIGNAL_APP_ID", // App ID của bạn
        included_segments: ["Total Subscriptions"], // Gửi cho tất cả mọi người đã đăng ký
        headings: { en: heading || "Thông báo môn phái" },
        contents: { en: message },
        url: "https://taysonxuanbinh.com/notifications" // Bấm vào tin thì mở trang này
      }),
    });

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
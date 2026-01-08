// Ưu tiên lấy từ biến môi trường, nếu không có mới dùng link cứng
const VERCEL_URL = process.env.NEXT_PUBLIC_VERCEL_URL 
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` 
  : 'https://tay-son-xuan-binh.vercel.app'; // <--- Kiểm tra kỹ chính tả link này

export const getApiUrl = (endpoint: string) => {
  // 1. Kiểm tra nếu đang chạy trên trình duyệt (Web)
  if (typeof window !== 'undefined' && window.location.origin.startsWith('http')) {
      // Đảm bảo endpoint bắt đầu bằng /
      return endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  }
  
  // 2. Nếu đang chạy trên App .exe (file:// hoặc app://)
  // Xử lý để không bị dư/thiếu dấu gạch chéo (/)
  const cleanBaseUrl = VERCEL_URL.endsWith('/') ? VERCEL_URL.slice(0, -1) : VERCEL_URL;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  return `${cleanBaseUrl}${cleanEndpoint}`;
};
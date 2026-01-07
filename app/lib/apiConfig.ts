// QUAN TRỌNG: Thay dòng dưới bằng link Web Vercel của bạn sau khi deploy xong
// Ví dụ: const VERCEL_URL = 'https://taysonxuanbinh.vercel.app';
const VERCEL_URL = 'https://tay-son-xuan-binh.vercel.app'; 

export const getApiUrl = (endpoint: string) => {
  // Nếu đang chạy trên trình duyệt (Web), dùng đường dẫn nội bộ cho nhanh
  if (typeof window !== 'undefined' && window.location.origin.startsWith('http')) {
      return endpoint;
  }
  
  // Nếu đang chạy trên App .exe (file://), phải gọi về Server Vercel
  // Đảm bảo endpoint bắt đầu bằng /api
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${VERCEL_URL}${cleanEndpoint}`;
};
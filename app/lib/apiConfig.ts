const VERCEL_URL = 'https://tay-son-xuan-binh.vercel.app'; 

export const getApiUrl = (endpoint: string) => {
  // Đảm bảo endpoint luôn bắt đầu bằng /
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  if (typeof window !== 'undefined' && window.location.origin.startsWith('http')) {
      return cleanEndpoint; // Trên web dùng đường dẫn tương đối
  }
  
  // Trên App .exe: Xóa dấu / ở cuối VERCEL_URL nếu có để tránh lỗi //
  const base = VERCEL_URL.endsWith('/') ? VERCEL_URL.slice(0, -1) : VERCEL_URL;
  return `${base}${cleanEndpoint}`;
};
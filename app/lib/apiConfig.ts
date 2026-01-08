const VERCEL_URL = 'https://tay-son-xuan-binh.vercel.app'; 

export const getApiUrl = (endpoint: string) => {
  // Chuẩn hóa endpoint: luôn bắt đầu bằng / và không có khoảng trắng
  const cleanEndpoint = endpoint.trim().startsWith('/') ? endpoint.trim() : `/${endpoint.trim()}`;
  
  if (typeof window !== 'undefined' && window.location.origin.startsWith('http')) {
      return cleanEndpoint; 
  }
  
  // Xóa dấu / ở cuối VERCEL_URL nếu lỡ tay thêm vào
  const base = VERCEL_URL.endsWith('/') ? VERCEL_URL.slice(0, -1) : VERCEL_URL;
  return `${base}${cleanEndpoint}`;
};
const VERCEL_URL = 'https://tay-son-xuan-binh.vercel.app'; 

export const getApiUrl = (endpoint: string) => {
  const cleanEndpoint = endpoint.trim().startsWith('/') ? endpoint.trim() : `/${endpoint.trim()}`;
  
  // Thêm dấu / vào cuối endpoint nếu chưa có để Vercel nhận diện đúng route
  const finalEndpoint = cleanEndpoint.endsWith('/') ? cleanEndpoint : `${cleanEndpoint}/`;

  if (typeof window !== 'undefined' && window.location.origin.startsWith('http')) {
      return finalEndpoint; 
  }
  
  const base = VERCEL_URL.endsWith('/') ? VERCEL_URL.slice(0, -1) : VERCEL_URL;
  return `${base}${finalEndpoint}`;
};
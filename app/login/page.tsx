'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.push('/');
      router.refresh(); 
    } catch (error: any) {
      alert('Đăng nhập thất bại: ' + (error.message === 'Invalid login credentials' ? 'Sai email hoặc mật khẩu' : error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#2b0e0e] relative overflow-hidden p-4 font-sans">
      
      {/* 1. ẢNH NỀN VÕ THUẬT */}
      <div 
        className="absolute inset-0 z-0 transition-transform duration-[20s] hover:scale-110 ease-linear"
        style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.4,
            mixBlendMode: 'overlay' 
        }}
      />
      
      <div className="absolute inset-0 bg-linear-to-b from-red-950/80 via-red-900/60 to-red-950/90 z-0"></div>

      {/* 2. HỌA TIẾT TRỐNG ĐỒNG (QUAY CHẬM) */}
      <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none z-0">
         <svg viewBox="0 0 100 100" className="w-[140vmin] h-[140vmin] text-yellow-500 fill-current animate-spin-slow drop-shadow-2xl">
            <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="0.5" fill="none" />
            <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="0.5" fill="none" strokeDasharray="2 1" />
            <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="1" fill="none" />
            <path d="M50 25 L55 40 L70 40 L58 50 L63 65 L50 55 L37 65 L42 50 L30 40 L45 40 Z" />
         </svg>
      </div>

      {/* 3. FORM ĐĂNG NHẬP (ĐÃ THU NHỎ TRÊN MOBILE) */}
      {/* Thay đổi: w-[90%] max-w-sm (Mobile) -> md:w-full md:max-w-md (PC) */}
      {/* Thay đổi: p-6 (Mobile) -> md:p-10 (PC) */}
      <div className="bg-[#fdfbf7] w-[90%] max-w-sm md:w-full md:max-w-md p-6 md:p-10 rounded-xl shadow-2xl border-y-8 border-red-800 relative z-10 animate-in zoom-in duration-500 group">
        
        {/* Đường viền trang trí */}
        <div className="absolute top-2 left-2 w-3 h-3 md:w-4 md:h-4 border-t-2 border-l-2 border-red-800"></div>
        <div className="absolute top-2 right-2 w-3 h-3 md:w-4 md:h-4 border-t-2 border-r-2 border-red-800"></div>
        <div className="absolute bottom-2 left-2 w-3 h-3 md:w-4 md:h-4 border-b-2 border-l-2 border-red-800"></div>
        <div className="absolute bottom-2 right-2 w-3 h-3 md:w-4 md:h-4 border-b-2 border-r-2 border-red-800"></div>

        {/* Logo & Tiêu đề */}
        <div className="text-center mb-6 md:mb-8 relative">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-red-900 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4 border-4 border-yellow-500 shadow-xl relative z-10 group-hover:scale-105 transition-transform duration-300">
                <span className="text-3xl md:text-4xl font-black text-yellow-400 font-serif pt-2">TS</span>
            </div>
            <div className="absolute top-12 left-1/2 -translate-x-1/2 w-24 h-12 bg-yellow-500/30 blur-xl rounded-full -z-0"></div>

            <h1 className="text-xl md:text-3xl font-serif font-black text-red-900 uppercase tracking-tight">Tây Sơn Xuân Bình</h1>
            <div className="flex items-center justify-center gap-2 mt-2 opacity-80">
                <div className="h-px w-6 md:w-8 bg-red-800"></div>
                <p className="text-red-800 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em]">Tinh Hoa Võ Việt</p>
                <div className="h-px w-6 md:w-8 bg-red-800"></div>
            </div>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleLogin} className="space-y-4 md:space-y-6">
            <div className="group/input">
                <label className="block text-[10px] md:text-xs font-black text-stone-500 uppercase mb-1 ml-1 group-focus-within/input:text-red-800 transition-colors">Định Danh (Email)</label>
                <input 
                    type="email" 
                    required
                    placeholder="nhapmon@tayson.vn"
                    className="w-full px-4 py-3 md:py-3.5 rounded-lg border-2 border-stone-300 focus:border-red-900 focus:ring-4 focus:ring-red-900/10 focus:outline-none font-bold text-stone-800 bg-stone-50 transition-all placeholder:text-stone-300 text-sm md:text-base"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                />
            </div>

            <div className="group/input">
                <label className="block text-[10px] md:text-xs font-black text-stone-500 uppercase mb-1 ml-1 group-focus-within/input:text-red-800 transition-colors">Mật Khẩu</label>
                <input 
                    type="password" 
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-3 md:py-3.5 rounded-lg border-2 border-stone-300 focus:border-red-900 focus:ring-4 focus:ring-red-900/10 focus:outline-none font-bold text-stone-800 bg-stone-50 transition-all placeholder:text-stone-300 text-sm md:text-base"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3 md:py-4 bg-linear-to-r from-red-900 to-red-800 hover:from-red-800 hover:to-red-700 text-yellow-400 font-black uppercase rounded-lg shadow-lg hover:shadow-red-900/40 transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 border border-red-950 mt-4 text-sm md:text-base"
            >
                {loading ? (
                    <>
                        <svg className="animate-spin h-4 w-4 md:h-5 md:w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <span>Đang Nhập...</span>
                    </>
                ) : (
                    <>
                        <span>Tiến Vào Môn Phái</span>
                        <span className="text-lg">➔</span>
                    </>
                )}
            </button>
        </form>

        {/* Footer */}
        <div className="mt-6 md:mt-8 text-center border-t border-stone-200 pt-4">
            <a href="/" className="inline-flex items-center gap-2 text-stone-400 hover:text-red-800 text-[10px] md:text-xs font-bold uppercase transition-colors group/link">
                <span className="group-hover/link:-translate-x-1 transition-transform">←</span> Quay lại trang chủ
            </a>
        </div>
      </div>
    </div>
  );
}
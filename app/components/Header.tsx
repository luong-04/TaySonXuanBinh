'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface SiteSetting {
  key: string;
  value: string;
}

export default function Header() {
  const [info, setInfo] = useState({ name: 'Đang tải...', logo: '' });
  const [user, setUser] = useState<any>(null);
  const [showLogin, setShowLogin] = useState(false);
  
  // State cho form đăng nhập
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // 1. Tải cấu hình & Kiểm tra User đang đăng nhập
  useEffect(() => {
    async function initData() {
      // Lấy Logo/Tên
      const { data: settingsData } = await supabase.from('site_settings').select('*');
      if (settingsData) {
        const settings = settingsData as unknown as SiteSetting[];
        const name = settings.find((k) => k.key === 'school_name')?.value;
        const logo = settings.find((k) => k.key === 'logo_url')?.value;
        setInfo({ name: name || 'Môn Phái Tây Sơn Xuân Bình', logo: logo || '' });
      }

      // Lấy User hiện tại (nếu đã đăng nhập trước đó)
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    }
    initData();
  }, []);

  // 2. Hàm Đăng Nhập
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert('Đăng nhập thất bại: ' + error.message);
    } else {
      setUser(data.user);
      setShowLogin(false); // Tắt popup login
      window.location.reload(); // Reload để cập nhật quyền Admin
    }
    setLoading(false);
  };

  // 3. Hàm Đăng Xuất
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.reload();
  };

  return (
    <>
      <header className="bg-red-900 text-white p-4 shadow-md flex items-center justify-between sticky top-0 z-50">
        {/* Bên Trái: Logo & Tên */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-full overflow-hidden border-2 border-yellow-500 flex items-center justify-center flex-shrink-0">
            {info.logo ? <img src={info.logo} alt="Logo" className="w-full h-full object-cover"/> : <span className="text-red-900 font-bold text-xs">LOGO</span>}
          </div>
          <div>
            <h1 className="text-sm md:text-xl font-bold uppercase max-w-[200px] md:max-w-none">{info.name}</h1>
            <p className="hidden md:block text-xs text-yellow-300">Hệ thống quản lý môn phái trực tuyến</p>
          </div>
        </div>

        {/* Bên Phải: Nút Đăng nhập / User Info */}
        <div>
          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold">{user.email}</p>
                <p className="text-xs text-green-300">Đang hoạt động</p>
              </div>
              <button onClick={handleLogout} className="bg-red-800 hover:bg-red-700 border border-red-600 px-3 py-1 rounded text-sm">
                Đăng xuất
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowLogin(true)}
              className="bg-yellow-500 hover:bg-yellow-400 text-red-900 font-bold px-4 py-2 rounded shadow transition-transform hover:scale-105"
            >
              Đăng Nhập
            </button>
          )}
        </div>
      </header>

      {/* POPUP FORM ĐĂNG NHẬP */}
      {showLogin && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100]">
          <div className="bg-white p-6 rounded-lg shadow-2xl w-96 relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setShowLogin(false)} className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-xl font-bold">&times;</button>
            
            <h2 className="text-2xl font-bold text-center text-red-900 mb-6">Đăng Nhập Hệ Thống</h2>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input 
                  type="email" required 
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="admin@tayson.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Mật khẩu</label>
                <input 
                  type="password" required 
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="******"
                  value={password} onChange={e => setPassword(e.target.value)}
                />
              </div>

              <button 
                type="submit" disabled={loading}
                className="w-full bg-red-800 text-white font-bold py-2 rounded hover:bg-red-900 transition-colors"
              >
                {loading ? 'Đang xử lý...' : 'Đăng Nhập Ngay'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
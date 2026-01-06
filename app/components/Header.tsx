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
  const [userName, setUserName] = useState(''); // State lưu tên hiển thị
  const [showLogin, setShowLogin] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function initData() {
      // 1. Lấy thông tin Website
      const { data: settingsData } = await supabase.from('site_settings').select('*');
      if (settingsData) {
        const settings = settingsData as unknown as SiteSetting[];
        const name = settings.find((k) => k.key === 'school_name')?.value;
        const logo = settings.find((k) => k.key === 'logo_url')?.value;
        setInfo({ name: name || 'Môn Phái Tây Sơn Xuân Bình', logo: logo || '' });
        setEditName(name || 'Môn Phái Tây Sơn Xuân Bình');
      }

      // 2. Lấy thông tin User
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        
        // Truy vấn bảng profiles để lấy Tên đầy đủ
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('auth_id', session.user.id)
            .single();
        
        // Nếu có tên thì hiển thị tên, nếu không thì hiển thị email hoặc mặc định
        if (profile && profile.full_name) {
            setUserName(profile.full_name);
        } else {
            setUserName(session.user.email?.split('@')[0] || 'Đồng môn');
        }
      }
    }
    initData();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) alert('Lỗi: ' + error.message);
    else { setShowLogin(false); window.location.reload(); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleUpdateInfo = async () => {
      await supabase.from('site_settings').upsert({ key: 'school_name', value: editName });
      setInfo(prev => ({ ...prev, name: editName }));
      setShowEdit(false);
  };

  const handleLogoUpload = async (e: any) => {
      setUploading(true);
      const file = e.target.files[0];
      const fileName = `logo-${Date.now()}`;
      await supabase.storage.from('assets').upload(fileName, file);
      const { data } = supabase.storage.from('assets').getPublicUrl(fileName);
      await supabase.from('site_settings').upsert({ key: 'logo_url', value: data.publicUrl });
      setInfo(prev => ({ ...prev, logo: data.publicUrl }));
      setUploading(false);
  };

  return (
    // HEADER: Màu Đỏ Đô + Chữ Vàng (Giữ nguyên bản sắc)
    <header className="bg-red-900 text-yellow-50 shadow-md border-b-4 border-yellow-600 py-4 px-6 flex justify-between items-center relative z-50">
      
      {/* LOGO & TÊN */}
      <div className="flex items-center gap-4 group cursor-pointer" onClick={() => user && setShowEdit(true)}>
        <div className="w-16 h-16 rounded-full border-2 border-yellow-500 overflow-hidden shadow-lg bg-white flex items-center justify-center relative">
            {info.logo ? <img src={info.logo} className="w-full h-full object-cover"/> : <span className="text-2xl font-serif font-bold text-red-900">VO</span>}
            {user && <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold">SỬA</div>}
        </div>
        <div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-yellow-50 drop-shadow-sm uppercase">
                {info.name}
            </h1>
            <p className="text-xs text-yellow-200 font-serif uppercase italic mt-1 opacity-80">Phụng sự tổ quốc - Phát huy tinh hoa</p>
        </div>
      </div>

      {/* KHU VỰC NGƯỜI DÙNG */}
      <div>
        {user ? (
          <div className="flex items-center gap-4">
             <div className="text-right hidden md:block">
                 <p className="text-[10px] text-yellow-200 uppercase tracking-wider">Xin chào,</p>
                 {/* Hiển thị Tên người dùng thay vì Email */}
                 <p className="text-base font-bold text-white font-serif">{userName}</p>
             </div>
             <button onClick={handleLogout} className="bg-yellow-600 text-red-950 px-4 py-2 rounded font-bold hover:bg-yellow-500 text-xs shadow border border-yellow-400">
                Đăng Xuất
             </button>
          </div>
        ) : (
          <button onClick={() => setShowLogin(true)} className="bg-yellow-600 text-red-950 px-6 py-2 rounded font-bold hover:bg-yellow-500 shadow border border-yellow-400 font-serif">
            Đăng Nhập
          </button>
        )}
      </div>

      {/* MODAL LOGIN */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-lg w-full max-w-sm border-t-8 border-red-900 shadow-2xl animate-in zoom-in duration-200">
            <h3 className="font-serif font-bold text-2xl mb-6 text-center text-red-900 uppercase">Cổng Hệ Thống</h3>
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="email" placeholder="Email định danh" required value={email} onChange={e => setEmail(e.target.value)} 
                className="w-full border border-gray-300 p-3 rounded focus:border-red-900 outline-none text-gray-900" />
              <input type="password" placeholder="Mật khẩu" required value={password} onChange={e => setPassword(e.target.value)} 
                className="w-full border border-gray-300 p-3 rounded focus:border-red-900 outline-none text-gray-900" />
              
              <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowLogin(false)} className="text-gray-500 hover:text-red-900 font-bold text-sm px-4">Đóng</button>
                  <button disabled={loading} className="flex-1 bg-red-900 text-yellow-50 font-bold py-3 rounded hover:bg-red-800 shadow">
                    {loading ? 'Đang xác thực...' : 'MỞ CỔNG'}
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT INFO */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-lg w-full max-w-md border-4 border-yellow-600 relative shadow-2xl">
                <button onClick={() => setShowEdit(false)} className="absolute top-2 right-4 text-gray-400 hover:text-red-500 font-bold text-xl">&times;</button>
                <h3 className="font-serif font-bold text-xl mb-4 text-red-900 uppercase text-center">Thiết lập Môn Phái</h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Tên Môn Phái</label>
                        <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full border p-2 rounded focus:border-red-900 outline-none"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Logo Mới</label>
                        <div className="border-2 border-dashed border-gray-300 rounded p-4 text-center cursor-pointer hover:bg-gray-50 relative">
                            <span className="text-gray-500 text-sm font-bold">{uploading ? 'Đang tải lên...' : 'Bấm để chọn ảnh'}</span>
                            <input type="file" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*"/>
                        </div>
                    </div>
                    <button onClick={handleUpdateInfo} className="w-full bg-red-900 text-white font-bold py-3 rounded hover:bg-red-800 shadow mt-2">Lưu Thay Đổi</button>
                </div>
            </div>
        </div>
      )}
    </header>
  );
}
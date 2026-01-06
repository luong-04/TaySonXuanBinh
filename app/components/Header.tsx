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
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function initData() {
      const { data: settingsData } = await supabase.from('site_settings').select('*');
      if (settingsData) {
        const settings = settingsData as unknown as SiteSetting[];
        const name = settings.find((k) => k.key === 'school_name')?.value;
        const logo = settings.find((k) => k.key === 'logo_url')?.value;
        setInfo({ name: name || 'Môn Phái Tây Sơn Xuân Bình', logo: logo || '' });
        setEditName(name || 'Môn Phái Tây Sơn Xuân Bình');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
         const { data: profile } = await supabase.from('profiles').select('role').eq('auth_id', session.user.id).single();
         setUser({ ...session.user, role: profile?.role });
      }
    }
    initData();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert('Lỗi: ' + error.message);
    else window.location.reload();
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleUpdateSettings = async () => {
    try {
        setUploading(true);
        await supabase.from('site_settings').upsert({ key: 'school_name', value: editName });
        alert("Cập nhật thành công!");
        setShowEdit(false);
        setInfo(prev => ({ ...prev, name: editName }));
    } catch (error) {
        alert("Lỗi cập nhật");
    } finally {
        setUploading(false);
    }
  };

  const handleLogoUpload = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      setUploading(true);
      const fileName = `logo-${Date.now()}`;
      const { error } = await supabase.storage.from('assets').upload(fileName, file);
      if (!error) {
          const { data } = supabase.storage.from('assets').getPublicUrl(fileName);
          await supabase.from('site_settings').upsert({ key: 'logo_url', value: data.publicUrl });
          setInfo(prev => ({ ...prev, logo: data.publicUrl }));
      }
      setUploading(false);
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'master_head';

  return (
    <>
      <header className="bg-red-900 text-yellow-50 p-3 shadow-lg flex items-center justify-between sticky top-0 z-50 h-24 border-b-4 border-yellow-600">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white rounded-full overflow-hidden border-4 border-yellow-500 shadow-lg flex items-center justify-center shrink-0 relative group">
            {info.logo ? (
                <img src={info.logo} alt="Logo" className="w-full h-full object-cover"/>
            ) : (
                <span className="text-red-900 font-bold text-xs">LOGO</span>
            )}
            {isAdmin && (
                <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                    <span className="text-[10px] text-white font-bold uppercase">Đổi ảnh</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                </label>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-3xl font-serif font-black uppercase leading-none tracking-wide text-yellow-400 drop-shadow-md">
                    {info.name}
                </h1>
                {isAdmin && <button onClick={() => setShowEdit(true)} className="text-yellow-600 hover:text-white text-sm">✎</button>}
            </div>
            <p className="text-sm text-yellow-200/80 font-serif italic mt-1">Hệ thống quản lý môn phái trực tuyến</p>
          </div>
        </div>

        <div>
          {user ? (
            <div className="flex flex-col items-end gap-1">
              <span className="hidden md:block text-xs text-yellow-200">
                  Xin chào, <span className="font-bold text-white">{user.email}</span>
              </span>
              <button onClick={handleLogout} className="bg-red-950 border border-red-700 px-4 py-1.5 rounded text-xs text-yellow-500 hover:bg-red-800 hover:text-white transition-colors font-bold uppercase tracking-wider">
                Đăng xuất
              </button>
            </div>
          ) : (
            <button onClick={() => setShowLogin(true)} className="bg-yellow-600 text-red-950 font-bold px-5 py-2 rounded shadow-lg text-sm hover:bg-yellow-500 hover:scale-105 transition-all uppercase tracking-wide">
              Đăng Nhập
            </button>
          )}
        </div>
      </header>

      {showLogin && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-[#fdfbf7] p-8 rounded-lg shadow-2xl w-full max-w-sm relative border-4 border-red-900">
            <button onClick={() => setShowLogin(false)} className="absolute top-2 right-4 text-2xl font-bold text-red-900 hover:scale-110">&times;</button>
            <h2 className="text-2xl font-serif font-bold text-red-900 mb-6 text-center uppercase tracking-widest border-b-2 border-red-900/10 pb-4">Đăng Nhập</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="email" required placeholder="Email quản trị" value={email} onChange={e=>setEmail(e.target.value)} className="w-full border-2 border-red-900/20 p-3 rounded bg-white focus:border-red-900 outline-none font-serif"/>
              <input type="password" required placeholder="Mật khẩu" value={password} onChange={e=>setPassword(e.target.value)} className="w-full border-2 border-red-900/20 p-3 rounded bg-white focus:border-red-900 outline-none font-serif"/>
              <button disabled={loading} className="w-full bg-red-900 text-yellow-50 font-bold py-3 rounded hover:bg-red-800 uppercase tracking-widest shadow-lg transition-transform active:scale-95">
                {loading ? 'Đang kiểm tra...' : 'Vào hệ thống'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showEdit && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <div className="bg-[#fdfbf7] p-6 rounded-lg w-full max-w-md border-4 border-yellow-600">
                <h3 className="font-serif font-bold text-xl mb-4 text-red-900 uppercase">Đổi tên môn phái</h3>
                <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full border-2 border-red-900/30 p-3 rounded mb-6 font-serif text-lg bg-white"/>
                <div className="flex justify-end gap-3">
                    <button onClick={() => setShowEdit(false)} className="text-gray-600 px-4 py-2 hover:bg-gray-200 rounded font-bold">Hủy</button>
                    <button onClick={handleUpdateSettings} disabled={uploading} className="bg-red-900 text-white px-6 py-2 rounded font-bold hover:bg-red-800 shadow">Lưu Thay Đổi</button>
                </div>
            </div>
        </div>
      )}
    </>
  );
}
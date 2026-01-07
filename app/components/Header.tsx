'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import Cropper from 'react-easy-crop';

interface SiteSetting {
  key: string;
  value: string;
}

// --- HÀM HỖ TRỢ CẮT ẢNH ---
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

async function getCroppedImg(imageSrc: string, pixelCrop: any): Promise<Blob | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  canvas.width = pixelCrop.width; canvas.height = pixelCrop.height;
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
  return new Promise((resolve) => { canvas.toBlob((blob) => resolve(blob), 'image/png', 1); });
}

export default function Header() {
  const [info, setInfo] = useState({ name: 'Đang tải...', logo: '' });
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState('');
  
  // States Modals
  const [showLogin, setShowLogin] = useState(false);
  const [showNameEdit, setShowNameEdit] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  
  // States Form & Upload
  const [editName, setEditName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // States Crop Ảnh
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        setUser(session.user);
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('auth_id', session.user.id).single();
        if (profile && profile.full_name) setUserName(profile.full_name);
        else setUserName(session.user.email?.split('@')[0] || 'Đồng môn');
      }
    }
    initData();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) alert('Lỗi: ' + error.message); else { setShowLogin(false); window.location.reload(); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.reload(); };

  const handleUpdateName = async () => {
      await supabase.from('site_settings').upsert({ key: 'school_name', value: editName });
      setInfo(prev => ({ ...prev, name: editName })); setShowNameEdit(false);
  };

  const handleLogoClick = () => { if (user && fileInputRef.current) fileInputRef.current.click(); };

  const onFileChange = async (e: any) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => { setImageSrc(reader.result?.toString() || ''); setShowCropModal(true); });
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((_: any, croppedAreaPixels: any) => setCroppedAreaPixels(croppedAreaPixels), []);

  const handleCropSave = async () => {
      try {
          setUploading(true);
          if (!imageSrc || !croppedAreaPixels) return;
          const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
          if (!croppedBlob) throw new Error('Lỗi xử lý ảnh');
          const fileName = `logo-${Date.now()}.png`;
          const file = new File([croppedBlob], fileName, { type: 'image/png' });
          const { error } = await supabase.storage.from('assets').upload(fileName, file);
          if (error) throw error;
          const { data: publicData } = supabase.storage.from('assets').getPublicUrl(fileName);
          await supabase.from('site_settings').upsert({ key: 'logo_url', value: publicData.publicUrl });
          setInfo(prev => ({ ...prev, logo: publicData.publicUrl })); setShowCropModal(false); setImageSrc(null);
      } catch (error: any) { alert('Lỗi upload: ' + error.message); } finally { setUploading(false); }
  };

  return (
    <header className="bg-red-900 text-yellow-50 shadow-md border-b-4 border-yellow-600 py-2 px-3 md:py-3 md:px-6 flex justify-between items-center relative z-50 min-h-[60px]">
      
      {/* KHU VỰC LOGO & TÊN */}
      <div className="flex items-center gap-2 md:gap-4 flex-1">
        
        {/* LOGO */}
        <div 
            className={`relative w-12 h-12 md:w-20 md:h-20 bg-white border-2 border-yellow-500 shadow-lg overflow-hidden flex items-center justify-center group shrink-0 rounded-lg ${user ? 'cursor-pointer' : ''}`}
            onClick={handleLogoClick}
        >
            {info.logo ? <img src={info.logo} className="w-full h-full object-contain p-1"/> : <span className="text-xl md:text-2xl font-serif font-bold text-red-900">VO</span>}
            {user && <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-[8px] md:text-[10px] text-white font-bold uppercase text-center px-1">Đổi Ảnh</span></div>}
            <input type="file" ref={fileInputRef} onChange={onFileChange} className="hidden" accept="image/*" />
        </div>

        {/* TÊN & NÚT SỬA */}
        <div className="flex-1">
            <div className="flex items-start gap-1">
                {/* SỬA QUAN TRỌNG: whitespace-normal break-words để tự xuống dòng, không bị ... */}
                <h1 className="text-sm md:text-3xl font-serif font-bold text-yellow-50 drop-shadow-sm uppercase whitespace-normal break-words leading-tight">
                    {info.name ? info.name.normalize('NFC') : ''}
                </h1>
                {user && (
                    <button onClick={() => setShowNameEdit(true)} className="text-yellow-500 hover:text-white transition-colors shrink-0 mt-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                )}
            </div>
            <p className="text-[10px] md:text-xs text-yellow-200 font-serif uppercase italic mt-0.5 md:mt-1 opacity-80 whitespace-normal break-words hidden sm:block">
                {"Phụng sự tổ quốc - Phát huy tinh hoa".normalize('NFC')}
            </p>
        </div>
      </div>

      {/* USER INFO */}
      <div className="shrink-0 ml-2">
        {user ? (
          <div className="flex items-center gap-2 md:gap-4">
             <div className="text-right hidden md:block">
                 <p className="text-[10px] text-yellow-200 uppercase">Xin chào,</p>
                 <p className="text-base font-bold text-white font-serif">{userName ? userName.normalize('NFC') : ''}</p>
             </div>
             <button onClick={handleLogout} className="bg-yellow-600 text-red-950 px-3 py-1.5 md:px-4 md:py-2 rounded font-bold hover:bg-yellow-500 text-[10px] md:text-xs shadow border border-yellow-400 whitespace-nowrap">
                Đăng Xuất
             </button>
          </div>
        ) : (
          <button onClick={() => setShowLogin(true)} className="bg-yellow-600 text-red-950 px-4 py-1.5 md:px-6 md:py-2 rounded font-bold hover:bg-yellow-500 shadow border border-yellow-400 font-serif text-xs md:text-base whitespace-nowrap">
            Đăng Nhập
          </button>
        )}
      </div>

      {/* MODALS */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-white p-6 md:p-8 rounded-lg w-full max-w-sm border-t-8 border-red-900 shadow-2xl animate-in zoom-in duration-200">
            <h3 className="font-serif font-bold text-xl md:text-2xl mb-6 text-center text-red-900 uppercase">Cổng Hệ Thống</h3>
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="email" placeholder="Email định danh" required value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-gray-300 p-3 rounded focus:border-red-900 outline-none text-gray-900" />
              <input type="password" placeholder="Mật khẩu" required value={password} onChange={e => setPassword(e.target.value)} className="w-full border border-gray-300 p-3 rounded focus:border-red-900 outline-none text-gray-900" />
              <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowLogin(false)} className="text-gray-500 hover:text-red-900 font-bold text-sm px-4">Đóng</button>
                  <button disabled={loading} className="flex-1 bg-red-900 text-yellow-50 font-bold py-3 rounded hover:bg-red-800 shadow">{loading ? 'Đang xác thực...' : 'MỞ CỔNG'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showNameEdit && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-lg w-full max-w-md border-4 border-yellow-600 relative shadow-2xl animate-in zoom-in duration-200">
                <button onClick={() => setShowNameEdit(false)} className="absolute top-2 right-4 text-gray-400 hover:text-red-500 font-bold text-xl">&times;</button>
                <h3 className="font-serif font-bold text-xl mb-4 text-red-900 uppercase text-center">Đổi Tên Môn Phái</h3>
                <div className="space-y-4">
                    <div><label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Tên Mới</label><input value={editName} onChange={e => setEditName(e.target.value)} className="w-full border bg-red-900 p-3 rounded focus:border-red-900 outline-none font-serif text-lg"/></div>
                    <button onClick={handleUpdateName} className="w-full bg-red-900 text-white font-bold py-3 rounded hover:bg-red-800 shadow mt-2">Lưu Thay Đổi</button>
                </div>
            </div>
        </div>
      )}

      {showCropModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[110] p-4 backdrop-blur-md">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in duration-300 flex flex-col h-[500px]">
            <h3 className="font-serif font-bold text-red-900 text-xl mb-4 text-center uppercase">Căn Chỉnh Logo</h3>
            <div className="relative flex-1 bg-stone-900 rounded-lg overflow-hidden border-2 border-stone-200">
                <Cropper image={imageSrc || ''} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} objectFit="contain" />
            </div>
            <div className="mt-4 px-2"><input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-2" /></div>
            <div className="flex justify-between gap-3 mt-6">
                <button onClick={() => { setShowCropModal(false); setImageSrc(null); }} className="px-5 py-2 text-stone-500 font-bold hover:bg-stone-100 rounded-xl">Hủy</button>
                <button onClick={handleCropSave} disabled={uploading} className="px-6 py-2 bg-red-900 text-yellow-50 rounded-xl font-bold hover:bg-red-800 shadow text-white">{uploading ? 'Đang Lưu...' : 'Xong & Cập Nhật'}</button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
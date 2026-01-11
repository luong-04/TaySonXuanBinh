'use client';
import Link from 'next/link';
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import Cropper from 'react-easy-crop';
import { Bell, Clock } from 'lucide-react'; // Import thêm Clock icon

// --- ĐỊNH NGHĨA ---
interface SiteSetting { key: string; value: string; }
interface Notification { id: string; content: string; created_at: string; } // Interface cho thông báo

// --- HÀM CẮT ẢNH (GIỮ NGUYÊN) ---
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
  // --- STATE CŨ (GIỮ NGUYÊN) ---
  const [info, setInfo] = useState({ name: 'Đang tải...', logo: '' });
  const [isAdmin, setIsAdmin] = useState(false);
  const [showNameEdit, setShowNameEdit] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState({ id: '', full_name: '', avatar_url: '', bio: '', dob: '' });
  const [userAvatarFile, setUserAvatarFile] = useState<File | null>(null);
  const [userAvatarPreview, setUserAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // --- STATE THÔNG BÁO (NÂNG CẤP) ---
  const [notiCount, setNotiCount] = useState(0); 
  const [recentNotis, setRecentNotis] = useState<Notification[]>([]); // Lưu danh sách 10 tin
  const [showNotiDropdown, setShowNotiDropdown] = useState(false);
  const notiRef = useRef<HTMLDivElement>(null);

  // --- LOGIC XỬ LÝ THÔNG BÁO MỚI ---
  const fetchNotifications = async (userId?: string) => {
    // 1. Tải 10 thông báo mới nhất (luôn hiện, dù đã đọc hay chưa)
    const { data: listData } = await supabase
        .from('notifications')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);

    if (listData) setRecentNotis(listData);

    // 2. Tính số lượng chưa đọc dựa trên user
    if (userId) {
        // Lấy thời gian đọc cuối cùng từ DB
        const { data: profile } = await supabase
            .from('profiles')
            .select('last_read_noti_at')
            .eq('id', userId)
            .single();
        
        const lastRead = profile?.last_read_noti_at || '2000-01-01';

        // Đếm số tin mới hơn mốc thời gian đó
        const { count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)
            .gt('created_at', lastRead);

        const finalCount = count || 0;
        setNotiCount(finalCount);
        if ('setAppBadge' in navigator) navigator.setAppBadge(finalCount).catch(() => {});
    } else {
        // Khách vãng lai: Dùng localStorage
        const lastReadLocal = typeof window !== 'undefined' ? localStorage.getItem('guest_last_read') || '0' : '0';
        if (listData && listData.length > 0) {
            const newestTime = new Date(listData[0].created_at).getTime();
            // Nếu tin mới nhất mới hơn lần đọc cuối -> Hiện 1 chấm đỏ báo hiệu
            setNotiCount(newestTime > parseInt(lastReadLocal) ? 1 : 0);
        }
    }
  };

  useEffect(() => {
    fetchSettings();
    
    // Check user xong mới lấy thông báo
    const initData = async () => {
        const user = await checkUser(); 
        await fetchNotifications(user?.id);
    };
    initData();

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setShowDropdown(false);
      if (notiRef.current && !notiRef.current.contains(event.target as Node)) setShowNotiDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    // Realtime listener
    const handleLocalUpdate = () => { if (!showNotiDropdown) fetchNotifications(currentUser?.id); };
    window.addEventListener('noti-changed', handleLocalUpdate);

    const subscription = supabase
        .channel('noti-channel-header')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, 
            () => fetchNotifications(currentUser?.id)
        )
        .subscribe();

    return () => { 
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('noti-changed', handleLocalUpdate);
        supabase.removeChannel(subscription);
    }
  }, [currentUser?.id]);

  // --- HÀM BẤM CHUÔNG (CẬP NHẬT ĐÃ ĐỌC) ---
  const handleBellClick = async () => {
      const newState = !showNotiDropdown;
      setShowNotiDropdown(newState);

      if (newState) {
          // 1. Tắt số đỏ ngay
          setNotiCount(0);
          if ('clearAppBadge' in navigator) navigator.clearAppBadge().catch(() => {});

          // 2. Cập nhật DB hoặc LocalStorage
          if (currentUser) {
              await supabase.from('profiles').update({ last_read_noti_at: new Date().toISOString() }).eq('id', currentUser.id);
          } else {
              localStorage.setItem('guest_last_read', Date.now().toString());
          }
      }
  };

  // --- CÁC HÀM LOGIC CŨ (GIỮ NGUYÊN) ---
  const fetchSettings = async () => { const { data: settingsData } = await supabase.from('site_settings').select('*'); if (settingsData) { const settings = settingsData as unknown as SiteSetting[]; const name = settings.find((k) => k.key === 'school_name')?.value; const logo = settings.find((k) => k.key === 'logo_url')?.value; setInfo({ name: name || 'Môn Phái Tây Sơn Xuân Bình', logo: logo || '' }); setEditName(name || 'Môn Phái Tây Sơn Xuân Bình'); } };
  
  // Sửa hàm checkUser để return data (giúp useEffect ở trên dùng được ngay)
  const checkUser = async () => { 
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('role, id, full_name, avatar_url, bio, dob, last_read_noti_at').eq('auth_id', user.id).single();
        if (data) {
          if (data.role === 'admin' || data.role === 'master_head') setIsAdmin(true);
          setCurrentUser(data);
          setUserForm({ id: data.id, full_name: data.full_name || '', avatar_url: data.avatar_url || '', bio: data.bio || '', dob: data.dob || '' });
          return data; 
        }
      }
      return null;
  };

  const handleUpdateName = async () => { setUploading(true); await supabase.from('site_settings').upsert({ key: 'school_name', value: editName }); setInfo(prev => ({ ...prev, name: editName })); setShowNameEdit(false); setUploading(false); };
  const handleLogoClick = () => { if (isAdmin && fileInputRef.current) fileInputRef.current.click(); };
  const onFileChange = async (e: any) => { if (e.target.files && e.target.files.length > 0) { const file = e.target.files[0]; const reader = new FileReader(); reader.addEventListener('load', () => { setImageSrc(reader.result?.toString() || ''); setShowCropModal(true); }); reader.readAsDataURL(file); } };
  const onCropComplete = useCallback((_: any, croppedAreaPixels: any) => setCroppedAreaPixels(croppedAreaPixels), []);
  const handleCropSave = async () => { try { setUploading(true); if (!imageSrc || !croppedAreaPixels) return; const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels); if (!croppedBlob) throw new Error('Lỗi xử lý ảnh'); const fileName = `logo-${Date.now()}.png`; const file = new File([croppedBlob], fileName, { type: 'image/png' }); const { error } = await supabase.storage.from('assets').upload(fileName, file); if (error) throw error; const { data: publicData } = supabase.storage.from('assets').getPublicUrl(fileName); await supabase.from('site_settings').upsert({ key: 'logo_url', value: publicData.publicUrl }); setInfo(prev => ({ ...prev, logo: publicData.publicUrl })); setShowCropModal(false); setImageSrc(null); } catch (error: any) { alert('Lỗi: ' + error.message); } finally { setUploading(false); } };
  const handleUserAvatarChange = (e: any) => { const file = e.target.files[0]; if (file) { setUserAvatarFile(file); setUserAvatarPreview(URL.createObjectURL(file)); } };
  const handleSaveUserProfile = async (e: React.FormEvent) => { e.preventDefault(); setUploading(true); try { let avatarUrl = userForm.avatar_url; if (userAvatarFile) { const fileName = `avatar-${currentUser.id}-${Date.now()}`; const { error } = await supabase.storage.from('assets').upload(fileName, userAvatarFile); if (error) throw error; const { data } = supabase.storage.from('assets').getPublicUrl(fileName); avatarUrl = data.publicUrl; } const res = await fetch('/api/profile/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...userForm, avatar_url: avatarUrl }), }); const result = await res.json(); if (!result.success) throw new Error(result.error); alert('Cập nhật hồ sơ thành công!'); window.location.reload(); } catch (error: any) { alert('Lỗi: ' + error.message); } finally { setUploading(false); } };

  return (
    <header className="bg-red-900 text-yellow-50 shadow-md border-b-4 border-yellow-600 py-2 px-3 md:py-3 md:px-6 flex justify-between items-center relative z-50 min-h-16">
      {/* 1. LOGO & TÊN (GIỮ NGUYÊN) */}
      <div className="flex items-center gap-2 md:gap-4 flex-1">
        <div 
            className={`relative w-12 h-12 md:w-20 md:h-20 bg-white border-2 border-yellow-500 shadow-lg overflow-hidden flex items-center justify-center group shrink-0 rounded-lg ${isAdmin ? 'cursor-pointer' : ''}`}
            onClick={handleLogoClick}
        >
            {info.logo ? <img src={info.logo} className="w-full h-full object-contain p-1"/> : <span className="text-xl md:text-2xl font-serif font-bold text-red-900">VO</span>}
            {isAdmin && <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-[8px] md:text-[10px] text-white font-bold uppercase text-center px-1">Đổi Ảnh</span></div>}
            <input type="file" ref={fileInputRef} onChange={onFileChange} className="hidden" accept="image/*" />
        </div>

        <div className="flex-1">
            <div className="flex items-start gap-1">
                <h1 className="text-sm md:text-3xl font-serif font-bold text-yellow-50 drop-shadow-sm uppercase break-all leading-tight">
                    {info.name}
                </h1>
                {isAdmin && (
                    <button onClick={() => setShowNameEdit(true)} className="text-yellow-500 hover:text-white transition-colors shrink-0 mt-0.5" title="Sửa tên môn phái">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                )}
            </div>
            <p className="text-[10px] md:text-xs text-yellow-200 font-serif uppercase italic mt-0.5 md:mt-1 opacity-80 break-words hidden sm:block">
                {"Phụng sự tổ quốc - Phát huy tinh hoa"}
            </p>
        </div>
      </div>

      {/* 2. CHUÔNG & USER (ĐÃ NÂNG CẤP PHẦN CHUÔNG) */}
      <div className="shrink-0 ml-2 flex items-center gap-2 md:gap-4">
        
        {/* --- KHU VỰC THÔNG BÁO --- */}
        <div className="relative" ref={notiRef}>
             <button onClick={handleBellClick} className="relative p-2 text-yellow-400 hover:text-white transition-colors">
                <Bell size={24} />
                {/* Hiển thị số lượng chưa đọc */}
                {notiCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold leading-none text-red-100 transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full border border-red-900 animate-pulse shadow-md">
                        {notiCount > 99 ? '99+' : notiCount}
                    </span>
                )}
             </button>

             {showNotiDropdown && (
                <div className="absolute top-12 right-0 md:right-auto md:left-1/2 md:-translate-x-1/2 mt-2 w-80 md:w-96 bg-white rounded-xl shadow-2xl border border-red-900 animate-in zoom-in-95 duration-200 origin-top-right z-200 overflow-hidden flex flex-col">
                    <div className="bg-red-50 p-3 border-b border-red-100 font-bold text-red-900 text-sm flex justify-between items-center shrink-0">
                        <span className="flex items-center gap-2">📢 Thông báo mới</span>
                        <button onClick={() => setShowNotiDropdown(false)} className="text-stone-400 hover:text-red-900">✕</button>
                    </div>
                    
                    {/* DANH SÁCH 10 TIN MỚI NHẤT */}
                    <div className="max-h-[60vh] overflow-y-auto custom-scrollbar bg-stone-50">
                        {recentNotis.length > 0 ? (
                            recentNotis.map((item) => (
                                <div key={item.id} className="p-3 border-b border-stone-200 bg-white hover:bg-red-50 transition-colors">
                                    {/* Nội dung tin (Cắt bớt nếu dài quá 3 dòng) */}
                                    <p className="text-sm text-stone-800 line-clamp-3 leading-relaxed font-medium">
                                        {item.content}
                                    </p>
                                    <div className="flex items-center gap-1 mt-1.5 text-[10px] text-stone-400">
                                        <Clock size={10} />
                                        {new Date(item.created_at).toLocaleString('vi-VN')}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-stone-400 italic text-sm">
                                Chưa có thông báo nào.
                            </div>
                        )}
                    </div>

                    <div className="border-t border-stone-100 bg-stone-50">
                        <Link 
                            href="/notifications" 
                            onClick={() => setShowNotiDropdown(false)}
                            className="block w-full text-center py-3 text-xs font-bold text-red-900 hover:bg-red-100 transition-colors uppercase border-t border-stone-200"
                        >
                            Xem tất cả lịch sử →
                        </Link>
                    </div>
                </div>
             )}
        </div>
        
        {/* --- PHẦN USER (GIỮ NGUYÊN) --- */}
        {currentUser ? (
          <div className="flex items-center gap-2 md:gap-4 relative" ref={dropdownRef}>
             <div className="text-right hidden md:block">
                 <p className="text-[10px] text-yellow-200 uppercase">Xin chào,</p>
                 <p className="text-sm font-bold text-white font-serif">{currentUser.full_name}</p>
             </div>
             
             <button onClick={() => setShowDropdown(!showDropdown)} className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-yellow-500 overflow-hidden bg-white hover:scale-105 transition-transform focus:outline-none">
                <img src={currentUser.avatar_url || '/default-avatar.png'} className="w-full h-full object-cover" />
             </button>

             {showDropdown && (
                <div className="absolute top-14 right-0 bg-white rounded-lg shadow-xl py-2 w-48 border border-red-900 animate-in fade-in z-200">
                    <button onClick={() => { setShowUserModal(true); setShowDropdown(false); }} className="w-full text-left px-4 py-2 text-red-900 hover:bg-red-50 font-bold text-sm flex gap-2 items-center">
                        <span>⚙️</span> Hồ sơ cá nhân
                    </button>
                    <div className="h-px bg-red-100 my-1"></div>
                    <button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 font-bold text-sm flex gap-2 items-center">
                        <span>🚪</span> Đăng xuất
                    </button>
                </div>
             )}
          </div>
        ) : (
          <button onClick={() => window.location.href = '/login'} className="bg-yellow-600 text-red-950 px-4 py-1.5 md:px-6 md:py-2 rounded font-bold hover:bg-yellow-500 shadow border border-yellow-400 font-serif text-xs md:text-base whitespace-nowrap">
            Đăng Nhập
          </button>
        )}
      </div>
      
      {/* ... (GIỮ NGUYÊN CÁC MODAL HIỆN CÓ CỦA BẠN: showNameEdit, showCropModal, showUserModal) ... */}
      {/* (Phần code này rất dài nhưng không thay đổi gì, tôi vẫn paste lại đầy đủ để bạn copy 1 lần là chạy được luôn) */}
      {showNameEdit && ( <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-100 p-4 backdrop-blur-sm"> <div className="bg-white p-6 rounded-lg w-full max-w-md border-4 border-yellow-600 relative shadow-2xl animate-in zoom-in duration-200"> <button onClick={() => setShowNameEdit(false)} className="absolute top-2 right-4 text-gray-400 hover:text-red-500 font-bold text-xl">&times;</button> <h3 className="font-serif font-bold text-xl mb-4 text-red-900 uppercase text-center">Đổi Tên Môn Phái</h3> <div className="space-y-4"> <div> <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Tên Mới</label> <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full border-2 border-red-900/20 p-3 rounded focus:border-red-900 outline-none font-serif text-lg text-red-900"/> </div> <button onClick={handleUpdateName} disabled={uploading} className="w-full bg-red-900 text-white font-bold py-3 rounded hover:bg-red-800 shadow mt-2"> {uploading ? 'Đang lưu...' : 'Lưu Thay Đổi'} </button> </div> </div> </div> )}
      {showCropModal && ( <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-110 p-4 backdrop-blur-md"> <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in duration-300 flex flex-col h-125"> <h3 className="font-serif font-bold text-red-900 text-xl mb-4 text-center uppercase">Căn Chỉnh Logo</h3> <div className="relative flex-1 bg-stone-900 rounded-lg overflow-hidden border-2 border-stone-200"> <Cropper image={imageSrc || ''} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} objectFit="contain" /> </div> <div className="mt-4 px-2"><input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-2" /></div> <div className="flex justify-between gap-3 mt-6"> <button onClick={() => { setShowCropModal(false); setImageSrc(null); }} className="px-5 py-2 text-stone-500 font-bold hover:bg-stone-100 rounded-xl">Hủy</button> <button onClick={handleCropSave} disabled={uploading} className="px-6 py-2 bg-red-900 text-yellow-50 rounded-xl font-bold hover:bg-red-800 shadow">{uploading ? 'Đang Lưu...' : 'Xong & Cập Nhật'}</button> </div> </div> </div> )}
      {showUserModal && ( <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-110 p-4 backdrop-blur-sm"> <div className="bg-[#fdfbf7] rounded-2xl shadow-2xl w-full max-w-md p-6 border-4 border-double border-red-900/20 animate-in zoom-in duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar"> <div className="flex justify-between items-center mb-4 border-b border-red-900/10 pb-2"> <h3 className="text-xl font-serif font-bold text-red-900 uppercase">Hồ Sơ Cá Nhân</h3> <button onClick={() => setShowUserModal(false)} className="text-stone-400 hover:text-red-900 text-2xl font-bold">&times;</button> </div> <form onSubmit={handleSaveUserProfile} className="space-y-4"> <div className="flex flex-col items-center gap-2"> <div className="relative w-24 h-24 rounded-full border-2 border-red-900 overflow-hidden group shadow-md bg-white"> <img src={userAvatarPreview || userForm.avatar_url || '/default-avatar.png'} className="w-full h-full object-cover" /> <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"> <span className="text-[10px] text-white font-bold uppercase">Đổi ảnh</span> <input type="file" className="hidden" accept="image/*" onChange={handleUserAvatarChange} /> </label> </div> </div> <div> <label className="block text-xs font-bold text-stone-500 mb-1 uppercase">Họ và Tên</label> <input required className="text-red-900 font-bold w-full border border-stone-200 p-2 rounded-lg bg-white outline-none focus:border-red-800" value={userForm.full_name} onChange={e => setUserForm({...userForm, full_name: e.target.value})} /> </div> <div> <label className="block text-xs font-bold text-stone-500 mb-1 uppercase">Ngày Sinh (Dương Lịch)</label> <input type="date" className="text-red-900 font-medium w-full border border-stone-200 p-2 rounded-lg bg-white outline-none focus:border-red-800 cursor-pointer" value={userForm.dob || ''} onChange={e => setUserForm({...userForm, dob: e.target.value})} /> </div> <div> <label className="block text-xs font-bold text-stone-500 mb-1 uppercase">Giới thiệu (Bio)</label> <textarea rows={4} className="text-stone-700 w-full border border-stone-200 p-2 rounded-lg bg-white outline-none focus:border-red-800 text-sm resize-none" placeholder="Tiểu sử, thành tích, quá trình tập luyện..." value={userForm.bio} onChange={e => setUserForm({...userForm, bio: e.target.value})} /> </div> <div className="flex justify-end gap-3 pt-4 border-t border-red-900/10"> <button type="button" onClick={() => setShowUserModal(false)} className="px-4 py-2 text-stone-500 font-bold hover:bg-stone-100 rounded-lg text-sm">Hủy</button> <button type="submit" disabled={uploading} className="px-6 py-2 bg-red-900 text-white rounded-lg font-bold shadow-md hover:bg-red-800 text-sm"> {uploading ? 'Đang lưu...' : 'Lưu Hồ Sơ'} </button> </div> </form> </div> </div> )}     
    </header>
  );
}
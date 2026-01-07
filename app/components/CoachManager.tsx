'use client';
import { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '../lib/apiConfig';
import { supabase } from '../lib/supabase';
import Cropper from 'react-easy-crop'; 

interface Club { id: string; name: string; }
interface Coach {
  id: string; full_name: string; email: string | null; avatar_url: string | null;
  belt_level: number; national_rank: string | null; title: string | null;
  role: string; club_role: string | null; club_id: string | null;
  join_date: string; dob: string; master_id: string | null;
}

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
  return new Promise((resolve) => { canvas.toBlob((blob) => { resolve(blob); }, 'image/jpeg', 0.95); });
}

export default function CoachManager({ userRole }: { userRole: string }) {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]); 
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // States Crop Ảnh
  const [imageSrc, setImageSrc] = useState<string | null>(null); 
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [showCropModal, setShowCropModal] = useState(false); 

  const initialForm = {
    full_name: '', email: '', password: '', belt_level: 0, national_rank: '', 
    title: '', role: 'instructor', club_id: '', club_role: '',
    join_date: '', dob: '', master_id: '', avatar_url: ''
  };
  const [formData, setFormData] = useState(initialForm);

  const fetchData = async () => {
    setLoading(true);
    const { data: coachData } = await supabase.from('profiles').select('*').neq('role', 'student').order('belt_level', { ascending: false });
    if (coachData) setCoaches(coachData as any);
    const { data: clubData } = await supabase.from('clubs').select('id, name');
    if (clubData) setClubs(clubData);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const suggestTitle = (level: number) => {
    if (level >= 18) return "Võ Sư"; if (level >= 16) return "Chuẩn Võ Sư";
    if (level >= 15) return "Trợ Giáo Cao Cấp"; if (level >= 12) return "Huấn Luyện Viên";
    if (level >= 10) return "Hướng Dẫn Viên"; return "";
  };

  const handleBeltChange = (val: string) => {
    const level = parseInt(val) || 0;
    const suggested = suggestTitle(level);
    setFormData(prev => ({ ...prev, belt_level: level, title: suggested }));
  };

  const openAddModal = () => { setIsEditing(false); setFormData(initialForm); setShowModal(true); };

  const openEditModal = (coach: Coach) => {
      setIsEditing(true); setEditId(coach.id);
      setFormData({
          ...initialForm,
          full_name: coach.full_name,
          email: coach.email || '',
          belt_level: coach.belt_level || 0,
          national_rank: coach.national_rank || '',
          title: coach.title || '',
          role: coach.role,
          club_id: coach.club_id || '',
          club_role: coach.club_role || '',
          join_date: coach.join_date || '',
          dob: coach.dob || '',
          master_id: coach.master_id || '',
          avatar_url: coach.avatar_url || '',
          password: '', 
      });
      setShowModal(true);
  };

  const onFileChange = async (e: any) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => { setImageSrc(reader.result?.toString() || ''); setShowCropModal(true); });
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => { setCroppedAreaPixels(croppedAreaPixels); }, []);

  const handleCropAndUpload = async () => {
    try {
      setUploading(true);
      if (!imageSrc || !croppedAreaPixels) return;
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (!croppedBlob) throw new Error('Lỗi tạo ảnh');
      const fileName = `avatar-${Date.now()}.jpg`;
      const file = new File([croppedBlob], fileName, { type: 'image/jpeg' });
      const { error } = await supabase.storage.from('assets').upload(fileName, file);
      if (error) throw error;
      const { data } = supabase.storage.from('assets').getPublicUrl(fileName);
      setFormData({ ...formData, avatar_url: data.publicUrl });
      setShowCropModal(false); setImageSrc(null);
    } catch (error) { alert('Lỗi xử lý ảnh!'); } finally { setUploading(false); }
  };

  const handleDelete = async (id: string, name: string) => {
      if (!confirm(`CẢNH BÁO: XÓA VĨNH VIỄN HLV "${name}"?`)) return;
      try {
          const res = await fetch(getApiUrl('/api/admin/delete-user'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }), });
          const result = await res.json();
          if (!result.success) throw new Error(result.error);
          alert("Đã xóa thành công!"); fetchData();
      } catch (error: any) { alert("Lỗi: " + error.message); }
  };

  const handleDowngrade = async (id: string, name: string) => {
      if (!confirm(`HẠ CẤP: Chuyển HLV "${name}" xuống VÕ SINH?`)) return;
      try {
          const res = await fetch(getApiUrl('/api/admin/downgrade-user'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }), });
          const result = await res.json();
          if (!result.success) throw new Error(result.error);
          alert("Đã hạ cấp thành công!"); fetchData();
      } catch (error: any) { alert("Lỗi: " + error.message); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.full_name) { alert('Thiếu tên hoặc email!'); return; }
    if (!isEditing && !formData.password) { alert('Cần nhập mật khẩu!'); return; }

    try {
      setLoading(true);
      const url = getApiUrl(isEditing ?'/api/admin/update-user' : '/api/admin/create-user');
      const bodyData = isEditing ? { ...formData, id: editId } : formData;
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyData), });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      alert(isEditing ? 'Đã cập nhật!' : 'Đã thêm mới!');
      setShowModal(false); fetchData();
    } catch (error: any) { alert('Lỗi: ' + error.message); } finally { setLoading(false); }
  };

  const isAdmin = userRole === 'admin' || userRole === 'master_head';

  const filteredCoaches = coaches.filter(coach => {
      const term = searchTerm.toLowerCase();
      const clubName = clubs.find(c => c.id === coach.club_id)?.name.toLowerCase() || '';
      return (coach.full_name.toLowerCase().includes(term) || (coach.email && coach.email.toLowerCase().includes(term)) || clubName.includes(term));
  });

  return (
    <div className="p-4 md:p-6 h-full bg-[#fdfbf7] overflow-y-auto custom-scrollbar">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 md:mb-8 border-b border-red-900/10 pb-4 gap-4">
        <h2 className="text-2xl md:text-3xl font-serif font-bold text-red-900 uppercase tracking-wide text-center md:text-left">Quản Lý Giảng Viên</h2>
        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative group w-full md:w-64">
                <input type="text" placeholder="Tìm tên, chức vụ, CLB..." className="w-full pl-10 pr-4 py-2 rounded-full border border-stone-200 bg-white focus:border-red-800 outline-none text-sm transition-all shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <svg className="h-5 w-5 absolute left-3 top-2.5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            {isAdmin && <button onClick={openAddModal} className="w-full md:w-auto bg-red-900 text-yellow-50 px-5 py-2 rounded-xl shadow-md font-bold hover:bg-red-800 flex justify-center items-center gap-2 transition-transform active:scale-95 text-sm whitespace-nowrap"><span>+</span> Thêm HLV</button>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {filteredCoaches.map((coach) => {
          const masterName = coaches.find(c => c.id === coach.master_id)?.full_name;
          return (
            <div key={coach.id} className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 p-4 md:p-5 flex gap-4 md:gap-5 group border border-stone-100 hover:border-red-100 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-linear-to-b from-red-800 to-red-600 rounded-l-2xl"></div>
              
              {/* Avatar */}
              <div className="w-20 h-20 md:w-24 md:h-24 flex-shrink-0 bg-stone-100 rounded-xl overflow-hidden border-2 border-stone-100 shadow-inner group-hover:border-red-100 transition-colors">
                <img src={coach.avatar_url || 'https://via.placeholder.com/150'} className="w-full h-full object-cover"/>
              </div>

              {/* Thông tin - SỬA: whitespace-normal break-words để không bị cắt */}
              <div className="flex-1 flex flex-col justify-center min-w-0">
                <h3 className="font-serif font-bold text-lg md:text-xl text-stone-800 group-hover:text-red-900 transition-colors mb-1 whitespace-normal break-words leading-tight">{coach.full_name}</h3>
                
                <div className="flex flex-wrap items-center gap-1 md:gap-2 mb-2">
                    <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-800 px-2 py-0.5 rounded-md border border-red-100 whitespace-nowrap">{coach.club_role || coach.title || 'HLV'}</span>
                    {coach.national_rank && <span className="text-[9px] md:text-[10px] font-bold bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-md whitespace-nowrap">★ {coach.national_rank}</span>}
                </div>
                
                <div className="text-xs md:text-sm text-stone-500 space-y-1">
                  <p className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-stone-300 shrink-0"></span>Đai: <span className="font-bold text-stone-700">{coach.belt_level}/22</span></p>
                  {/* Sư phụ & CLB: Cho phép xuống dòng */}
                  {masterName ? (<p className="flex items-start gap-1 whitespace-normal" title={`Sư phụ: ${masterName}`}><span className="w-2 h-2 rounded-full bg-yellow-500 shrink-0 mt-1"></span><span className="text-stone-700">SP: {masterName}</span></p>) : (<p className="flex items-center gap-1 text-stone-300 italic"><span className="w-2 h-2 rounded-full bg-stone-200 shrink-0"></span>Chưa có sư phụ</p>)}
                  {coach.club_id && <p className="flex items-start gap-1 whitespace-normal" title={clubs.find(c => c.id === coach.club_id)?.name}><span className="w-2 h-2 rounded-full bg-blue-300 shrink-0 mt-1"></span>{clubs.find(c => c.id === coach.club_id)?.name || 'Chưa rõ CLB'}</p>}
                </div>
              </div>

              {/* NÚT THAO TÁC */}
              {isAdmin && (
                <div className="absolute top-2 right-2 flex flex-col gap-1 md:gap-2 md:top-4 md:right-4 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all transform md:translate-x-2 group-hover:translate-x-0">
                    <button onClick={() => openEditModal(coach)} className="bg-blue-50 text-blue-600 w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full hover:bg-blue-600 hover:text-white shadow transition-colors border border-blue-100">✎</button>
                    <button onClick={() => handleDowngrade(coach.id, coach.full_name)} className="bg-yellow-50 text-yellow-600 w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full hover:bg-yellow-500 hover:text-white shadow transition-colors border border-yellow-200">⬇</button>
                    <button onClick={() => handleDelete(coach.id, coach.full_name)} className="bg-red-50 text-red-600 w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full hover:bg-red-600 hover:text-white shadow transition-colors border border-red-100">×</button>
                </div>
              )}
            </div>
          );
        })}
        {filteredCoaches.length === 0 && <div className="col-span-full text-center py-10 text-stone-400 font-serif italic">Không tìm thấy kết quả.</div>}
      </div>

      {/* --- CÁC MODAL --- */}
      {showCropModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in duration-300 flex flex-col h-[500px]">
            <h3 className="font-serif font-bold text-red-900 text-xl mb-4 text-center">Căn Chỉnh Ảnh</h3>
            <div className="relative flex-1 bg-stone-900 rounded-lg overflow-hidden border-2 border-stone-200">
                <Cropper image={imageSrc || ''} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} />
            </div>
            <div className="mt-4 px-2"><input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" /></div>
            <div className="flex justify-between gap-3 mt-6">
                <button onClick={() => { setShowCropModal(false); setImageSrc(null); }} className="px-5 py-2 text-stone-500 font-bold hover:bg-stone-100 rounded-xl">Hủy</button>
                <button onClick={handleCropAndUpload} disabled={uploading} className="px-6 py-2 bg-red-900 text-yellow-50 rounded-xl font-bold hover:bg-red-800 shadow">{uploading ? 'Đang Xử Lý...' : 'Xong & Lưu'}</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#fdfbf7] rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border-4 border-double border-red-900/20">
            <div className="p-4 md:p-6 border-b border-red-100 flex justify-between items-center bg-white/50">
                <h3 className="text-xl md:text-2xl font-serif font-bold text-red-900 uppercase tracking-wide">{isEditing ? 'Cập Nhật Hồ Sơ' : 'Thêm Giảng Viên'}</h3>
                <button onClick={() => setShowModal(false)} className="text-stone-400 hover:text-red-500 font-bold text-2xl transition-colors">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
              <div className="col-span-1 md:col-span-4 flex flex-col items-center justify-start pt-2">
                  <label className="cursor-pointer group relative block w-32 h-32 md:w-40 md:h-40 border-2 border-dashed border-stone-300 rounded-2xl hover:border-red-500 transition-colors bg-white overflow-hidden shadow-inner">
                      {formData.avatar_url ? <img src={formData.avatar_url} className="w-full h-full object-cover"/> : <div className="flex flex-col items-center justify-center h-full text-stone-300"><span className="text-3xl md:text-4xl font-light">+</span></div>}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-white text-xs font-bold border border-white px-3 py-1 rounded-full uppercase">Đổi Ảnh</span></div>
                      <input type="file" onChange={onFileChange} className="hidden" accept="image/*"/>
                  </label>
                  <p className="text-[10px] text-stone-400 mt-2 italic text-center uppercase tracking-wide">Chân dung rõ mặt</p>
              </div>
              <div className="col-span-1 md:col-span-8 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div><label className="block text-xs font-bold text-stone-500 mb-1 uppercase">Họ và Tên (*)</label><input required className="w-full border border-stone-200 p-3 rounded-xl focus:border-red-800 outline-none bg-white shadow-sm font-serif text-lg" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} /></div>
                      <div><label className="block text-xs font-bold text-stone-500 mb-1 uppercase">Email (*)</label><input required type="email" className="w-full border border-stone-200 p-3 rounded-xl focus:border-red-800 outline-none bg-white shadow-sm" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div><label className="block text-xs font-bold text-stone-500 mb-1 uppercase">{isEditing ? 'Mật khẩu mới' : 'Mật khẩu (*)'}</label><input type="text" className="w-full border border-stone-200 p-3 rounded-xl focus:border-red-800 outline-none bg-white shadow-sm" placeholder={isEditing ? "Để trống nếu không đổi" : "******"} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} /></div>
                      <div><label className="block text-xs font-bold text-stone-500 mb-1 uppercase">Ngày sinh</label><input type="date" className="w-full border border-stone-200 p-3 rounded-xl focus:border-red-800 outline-none bg-white shadow-sm cursor-pointer" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} /></div>
                  </div>
                  {/* ... (Phần Form khác giữ nguyên cấu trúc grid-cols-1 sm:grid-cols-2 để responsive) ... */}
                  {/* Code đã tối ưu responsive ở trên rồi nên phần này tự động đẹp */}
                  <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 space-y-4">
                      <div><label className="block text-xs font-bold text-red-800 mb-1 uppercase">Sư Phụ</label><select className="w-full border border-red-100 p-2 rounded-lg focus:border-red-800 outline-none bg-white" value={formData.master_id} onChange={e => setFormData({...formData, master_id: e.target.value})}><option value="">-- Chọn Sư Phụ --</option>{coaches.filter(c => c.id !== editId).map(c => (<option key={c.id} value={c.id}>{c.full_name} (Đai {c.belt_level})</option>))}</select></div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div><label className="block text-xs font-bold text-red-800 mb-1 uppercase">Đơn vị quản lý</label><select className="w-full border border-red-100 p-2 rounded-lg focus:border-red-800 outline-none bg-white" value={formData.club_id} onChange={e => setFormData({...formData, club_id: e.target.value})}><option value="">-- Chọn CLB --</option>{clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                          <div><label className="block text-xs font-bold text-red-800 mb-1 uppercase">Chức vụ CLB</label><select className="w-full border border-red-100 p-2 rounded-lg focus:border-red-800 outline-none bg-white" value={formData.club_role} onChange={e => setFormData({...formData, club_role: e.target.value})}><option value="">-- Chọn chức vụ --</option><option value="Trưởng tràng">Trưởng tràng</option><option value="HLV Trưởng">HLV Trưởng</option><option value="HLV Phó">HLV Phó</option><option value="HLV Trợ giảng">HLV Trợ giảng</option><option value="Thành viên BHL">Thành viên BHL</option></select></div>
                      </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div><label className="block text-xs font-bold text-stone-500 mb-1 uppercase">Cấp đai</label><input type="number" max="22" className="w-full border border-stone-200 p-3 rounded-xl focus:border-red-800 outline-none bg-white shadow-sm text-center font-bold" value={formData.belt_level} onChange={e => handleBeltChange(e.target.value)} /></div>
                      <div className="sm:col-span-2"><label className="block text-xs font-bold text-stone-500 mb-1 uppercase">Danh hiệu</label><input type="text" className="w-full border border-stone-200 p-3 rounded-xl focus:border-red-800 outline-none bg-white shadow-sm font-bold text-red-800" placeholder="Tự động..." value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /></div>
                      <div className="sm:col-span-3"><label className="block text-xs font-bold text-stone-500 mb-1 uppercase">Đẳng Quốc Gia</label><input type="text" placeholder="VD: 3 Đẳng" className="w-full border border-stone-200 p-3 rounded-xl focus:border-red-800 outline-none bg-white shadow-sm" value={formData.national_rank} onChange={e => setFormData({...formData, national_rank: e.target.value})} /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label className="block text-xs font-bold text-stone-500 mb-1 uppercase">Quyền quản trị</label><select className="w-full border border-stone-200 p-3 rounded-xl focus:border-red-800 outline-none bg-white shadow-sm" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}><option value="instructor">Giảng viên (Thường)</option><option value="master_head">Trưởng Tràng (Cao cấp)</option><option value="grandmaster">Sư Tổ</option><option value="admin">Admin Kỹ thuật</option></select></div>
                      <div><label className="block text-xs font-bold text-stone-500 mb-1 uppercase">Ngày nhập môn</label><input type="date" className="w-full border border-stone-200 p-3 rounded-xl focus:border-red-800 outline-none bg-white shadow-sm cursor-pointer" value={formData.join_date} onChange={e => setFormData({...formData, join_date: e.target.value})} /></div>
                  </div>
              </div>
              <div className="col-span-1 md:col-span-12 flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-dashed border-stone-200">
                <button type="button" onClick={() => setShowModal(false)} className="w-full sm:w-auto px-6 py-2 text-stone-500 hover:bg-stone-100 rounded-xl font-bold transition-colors">Hủy Bỏ</button>
                <button type="submit" disabled={loading || uploading} className="w-full sm:w-auto px-8 py-2 bg-red-900 text-yellow-50 rounded-xl hover:bg-red-800 font-bold shadow-lg transition-transform active:scale-95">{loading ? 'Đang Xử Lý...' : (isEditing ? 'Lưu Hồ Sơ' : 'Tạo Hồ Sơ')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Club {
  id: string;
  name: string;
}

interface Coach {
  id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  belt_level: number;
  national_rank: string | null;
  title: string | null;
  role: string;
  club_role: string | null; // Chức vụ trong CLB
  club_id: string | null;   // Thuộc CLB nào
  join_date: string;
  dob: string;
  master_id: string | null;
}

export default function CoachManager({ userRole }: { userRole: string }) {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]); // Danh sách CLB để chọn
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  const initialForm = {
    full_name: '', email: '', password: '', 
    belt_level: 0, national_rank: '', 
    title: '', role: 'instructor', 
    club_id: '', club_role: '', // Mới thêm
    join_date: '', dob: '', master_id: '', avatar_url: ''
  };
  const [formData, setFormData] = useState(initialForm);

  // 1. Tải HLV và Danh sách CLB
  const fetchData = async () => {
    setLoading(true);
    
    // Lấy HLV
    const { data: coachData } = await supabase
      .from('profiles')
      .select('*')
      .neq('role', 'student') 
      .order('belt_level', { ascending: false });
    
    if (coachData) setCoaches(coachData as any);

    // Lấy CLB
    const { data: clubData } = await supabase.from('clubs').select('id, name');
    if (clubData) setClubs(clubData);

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // 2. Logic Tự động điền Danh hiệu theo Cấp đai
  // Bạn có thể sửa các mốc này theo quy định của môn phái
  const suggestTitle = (level: number) => {
    if (level >= 18) return "Võ Sư"; 
    if (level >= 16) return "Chuẩn Võ Sư";
    if (level >= 15) return "Trợ Giáo Cao Cấp";
    if (level >= 12) return "Huấn Luyện Viên";
    if (level >= 10) return "Hướng Dẫn Viên";
    return "";
  };

  const handleBeltChange = (level: number) => {
    const suggested = suggestTitle(level);
    setFormData(prev => ({ 
        ...prev, 
        belt_level: level, 
        title: suggested // Tự động điền danh hiệu
    }));
  };

  const openAddModal = () => {
      setIsEditing(false);
      setFormData(initialForm);
      setShowModal(true);
  };

  const openEditModal = (coach: Coach) => {
      setIsEditing(true);
      setEditId(coach.id);
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

  const handleUpload = async (event: any) => {
    try {
      setUploading(true);
      const file = event.target.files[0];
      if (!file) return;
      const fileName = `${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('assets').upload(fileName, file);
      if (error) throw error;
      const { data } = supabase.storage.from('assets').getPublicUrl(fileName);
      setFormData({ ...formData, avatar_url: data.publicUrl });
    } catch (error) {
      alert('Lỗi upload ảnh!');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
      if (!confirm(`Xóa HLV "${name}"? Hành động này không thể hoàn tác!`)) return;
      try {
          const res = await fetch('/api/admin/delete-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id }),
          });
          const result = await res.json();
          if (!result.success) throw new Error(result.error);
          alert("Đã xóa thành công!");
          fetchData();
      } catch (error: any) {
          alert("Lỗi: " + error.message);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.full_name) {
      alert('Thiếu tên hoặc email!');
      return;
    }
    if (!isEditing && !formData.password) {
        alert('Cần nhập mật khẩu cho tài khoản mới!');
        return;
    }

    try {
      setLoading(true);
      const url = isEditing ? '/api/admin/update-user' : '/api/admin/create-user';
      const bodyData = isEditing ? { ...formData, id: editId } : formData;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.error);

      alert(isEditing ? 'Đã cập nhật!' : 'Đã thêm mới!');
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      alert('Lỗi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = userRole === 'admin' || userRole === 'master_head';

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-red-900 uppercase">Quản Lý Huấn Luyện Viên</h2>
        {isAdmin && (
          <button onClick={openAddModal} className="bg-red-900 text-yellow-50 px-4 py-2 rounded shadow font-bold hover:bg-red-800 flex items-center gap-2">
            <span>+</span> Thêm HLV
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {coaches.map((coach) => (
          <div key={coach.id} className="bg-white border-2 border-transparent hover:border-red-200 rounded-lg shadow-sm p-4 flex gap-4 relative group hover:shadow-md transition-all">
            {/* Avatar */}
            <div className="w-20 h-20 flex-shrink-0 bg-gray-200 rounded-md overflow-hidden border border-gray-300">
              <img src={coach.avatar_url || 'https://via.placeholder.com/150'} className="w-full h-full object-cover"/>
            </div>
            
            {/* Info */}
            <div className="flex-1 overflow-hidden">
              <h3 className="font-bold text-lg text-gray-800 truncate">{coach.full_name}</h3>
              
              {/* Hiển thị Chức vụ CLB hoặc Danh hiệu */}
              <p className="text-xs text-red-800 font-bold uppercase mb-1">
                  {coach.club_role ? coach.club_role : (coach.title || 'Huấn luyện viên')}
              </p>
              
              <div className="text-sm space-y-0.5 text-gray-600">
                <div className="flex gap-2 text-xs">
                    <span className="bg-gray-100 px-1 rounded border">Đai: {coach.belt_level}/22</span>
                    {coach.title && <span className="bg-yellow-100 text-red-800 px-1 rounded border border-yellow-200 font-bold">{coach.title}</span>}
                </div>
                {coach.national_rank && <p className="text-red-600 font-bold text-xs">★ {coach.national_rank}</p>}
                
                {/* Hiển thị CLB */}
                {coach.club_id && (
                    <p className="text-xs text-blue-800 truncate">
                        🏫 {clubs.find(c => c.id === coach.club_id)?.name || 'CLB không xác định'}
                    </p>
                )}
              </div>
            </div>

            {/* ACTION BUTTONS */}
            {isAdmin && (
              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditModal(coach)} className="bg-blue-50 text-blue-600 p-1.5 rounded hover:bg-blue-100 shadow" title="Sửa">✎</button>
                  <button onClick={() => handleDelete(coach.id, coach.full_name)} className="bg-red-50 text-red-600 p-1.5 rounded hover:bg-red-100 shadow" title="Xóa">🗑</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* MODAL FORM */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto border-t-8 border-red-900">
            
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                <h3 className="text-lg font-bold text-red-900 uppercase">
                    {isEditing ? 'Cập Nhật Hồ Sơ' : 'Thêm HLV Mới'}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500 font-bold text-xl">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* CỘT 1: ẢNH (3/12) */}
              <div className="md:col-span-3 flex flex-col items-center">
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Ảnh Đại Diện</label>
                  <label className="cursor-pointer group relative block w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-red-500 transition-colors bg-gray-50 overflow-hidden">
                      {formData.avatar_url ? (
                          <img src={formData.avatar_url} className="w-full h-full object-cover"/>
                      ) : (
                          <div className="flex flex-col items-center justify-center h-full text-gray-400"><span className="text-2xl">+</span><span className="text-[10px]">Chọn ảnh</span></div>
                      )}
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-white text-[10px] font-bold border border-white px-2 py-1 rounded">{uploading ? '...' : 'ĐỔI ẢNH'}</span>
                      </div>
                      <input type="file" onChange={handleUpload} className="hidden" accept="image/*"/>
                  </label>
              </div>

              {/* CỘT 2: THÔNG TIN (9/12) */}
              <div className="md:col-span-9 space-y-4">
                  {/* Hàng 1: Tên & Email */}
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Họ và Tên (*)</label>
                        <input required className="w-full border p-2 rounded focus:border-red-900 outline-none" 
                            value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Email (*)</label>
                        <input required type="email" className="w-full border p-2 rounded focus:border-red-900 outline-none" 
                            value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                      </div>
                  </div>

                  {/* Hàng 2: Mật khẩu & Ngày sinh */}
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">{isEditing ? 'Mật khẩu mới' : 'Mật khẩu (*)'}</label>
                        <input type="text" className="w-full border p-2 rounded focus:border-red-900 outline-none" 
                            placeholder={isEditing ? "Để trống nếu không đổi" : "******"}
                            value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Ngày sinh</label>
                        <input type="date" className="w-full border p-2 rounded focus:border-red-900 outline-none cursor-pointer" 
                            value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
                      </div>
                  </div>
                  
                  {/* Hàng 3: CÂU LẠC BỘ & CHỨC VỤ (Mới) */}
                  <div className="grid grid-cols-2 gap-4 bg-blue-50 p-3 rounded border border-blue-100">
                      <div>
                         <label className="block text-xs font-bold text-blue-800 mb-1">Câu Lạc Bộ Phụ Trách</label>
                         <select className="w-full border p-2 rounded focus:border-blue-800 outline-none"
                            value={formData.club_id} onChange={e => setFormData({...formData, club_id: e.target.value})}>
                            <option value="">-- Chọn CLB --</option>
                            {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                         </select>
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-blue-800 mb-1">Chức vụ trong CLB</label>
                         <select className="w-full border p-2 rounded focus:border-blue-800 outline-none"
                            value={formData.club_role} onChange={e => setFormData({...formData, club_role: e.target.value})}>
                            <option value="">-- Chọn chức vụ --</option>
                            <option value="Trưởng tràng">Trưởng tràng</option>
                            <option value="HLV Trưởng">HLV Trưởng</option>
                            <option value="HLV Phó">HLV Phó</option>
                            <option value="HLV Trợ giảng">HLV Trợ giảng</option>
                            <option value="Thành viên BHL">Thành viên BHL</option>
                         </select>
                      </div>
                  </div>

                  {/* Hàng 4: Chuyên môn (Đai, Danh hiệu, Đẳng) */}
                  <div className="grid grid-cols-3 gap-3 bg-red-50 p-3 rounded border border-red-100">
                      <div>
                        <label className="block text-xs font-bold text-red-800 mb-1">Cấp đai (0-22)</label>
                        <input type="number" max="22" className="w-full border p-2 rounded focus:border-red-800 outline-none font-bold text-center" 
                          value={formData.belt_level} onChange={e => handleBeltChange(parseInt(e.target.value))} />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-red-800 mb-1">Danh hiệu (Tự động theo đai)</label>
                        <input type="text" className="w-full border p-2 rounded focus:border-red-800 outline-none font-bold text-red-700" 
                          placeholder="VD: Võ Sư, Chuẩn Võ Sư..."
                          value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                      </div>
                      <div className="col-span-3">
                         <label className="block text-xs font-bold text-red-800 mb-1">Đẳng Quốc Gia (Nếu có)</label>
                         <input type="text" placeholder="VD: 3 Đẳng" className="w-full border p-2 rounded focus:border-red-800 outline-none"
                            value={formData.national_rank} onChange={e => setFormData({...formData, national_rank: e.target.value})} />
                      </div>
                  </div>

                  {/* Hàng 5: Quyền hệ thống & Ngày gia nhập */}
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                           <label className="block text-xs font-bold text-gray-700 mb-1">Quyền quản trị</label>
                           <select className="w-full border p-2 rounded focus:border-red-900 outline-none" 
                             value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                             <option value="instructor">Giảng viên (Thường)</option>
                             <option value="master_head">Trưởng Tràng (Cao cấp)</option>
                             <option value="grandmaster">Sư Tổ</option>
                             <option value="admin">Admin Kỹ thuật</option>
                           </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Ngày gia nhập môn</label>
                          <input type="date" className="w-full border p-2 rounded focus:border-red-900 outline-none cursor-pointer" 
                            value={formData.join_date} onChange={e => setFormData({...formData, join_date: e.target.value})} />
                      </div>
                  </div>
              </div>

              <div className="col-span-1 md:col-span-12 flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded font-bold">Hủy</button>
                <button type="submit" disabled={loading || uploading} className="px-6 py-2 bg-red-900 text-white rounded hover:bg-red-800 font-bold shadow">
                  {loading ? 'Đang lưu...' : (isEditing ? 'Lưu Hồ Sơ' : 'Tạo Hồ Sơ')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
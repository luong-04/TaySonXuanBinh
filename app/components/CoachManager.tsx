'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Coach {
  id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  belt_level: number;
  is_national_rank: boolean;
  title: string | null;
  role: string;
  join_date: string;
  dob: string;
  master_id: string | null;
}

export default function CoachManager({ userRole }: { userRole: string }) {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    full_name: '', email: '', password: '', 
    belt_level: 0, is_national_rank: false, 
    title: '', role: 'instructor', 
    join_date: '', dob: '', master_id: '', avatar_url: ''
  });

  // Lấy danh sách HLV
  const fetchCoaches = async () => {
    setLoading(true);
    // Lấy tất cả trừ võ sinh (student)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('role', 'student') 
      .order('belt_level', { ascending: false });
    
    if (data) setCoaches(data as any);
    setLoading(false);
  };

  useEffect(() => { fetchCoaches(); }, []);

  // Xử lý Upload Ảnh
  const handleUpload = async (event: any) => {
    try {
      setUploading(true);
      const file = event.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload vào bucket 'assets'
      const { error: uploadError } = await supabase.storage.from('assets').upload(filePath, file);
      if (uploadError) throw uploadError;

      // Lấy link ảnh public
      const { data } = supabase.storage.from('assets').getPublicUrl(filePath);
      setFormData({ ...formData, avatar_url: data.publicUrl });
      
    } catch (error) {
      alert('Lỗi upload ảnh!');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  // Xử lý Lưu (Tạo mới)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.full_name) {
      alert('Vui lòng điền Email, Mật khẩu và Họ tên!');
      return;
    }

    try {
      setLoading(true);
      // Gọi API Admin (Backend) để tạo user + profile
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.error);

      alert('Thêm HLV thành công!');
      setShowModal(false);
      fetchCoaches(); // Load lại danh sách
      
      // Reset form
      setFormData({
        full_name: '', email: '', password: '', belt_level: 0, 
        is_national_rank: false, title: '', role: 'instructor', 
        join_date: '', dob: '', master_id: '', avatar_url: ''
      });

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
          <button 
            onClick={() => setShowModal(true)}
            className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded shadow flex gap-2 font-bold"
          >
            + Thêm HLV Mới
          </button>
        )}
      </div>

      {loading ? <p>Đang tải...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coaches.map((coach) => (
            <div key={coach.id} className="bg-white border rounded-lg shadow-sm p-4 flex gap-4 relative overflow-hidden group">
              {/* Ảnh */}
              <div className="w-24 h-24 flex-shrink-0 bg-gray-200 rounded-md overflow-hidden">
                <img src={coach.avatar_url || 'https://via.placeholder.com/150'} className="w-full h-full object-cover"/>
              </div>
              
              {/* Thông tin */}
              <div className="flex-1">
                <h3 className="font-bold text-lg text-gray-800">{coach.full_name}</h3>
                <p className="text-sm text-gray-500">{coach.title || 'Huấn luyện viên'}</p>
                <div className="mt-2 text-sm space-y-1">
                  <p>🥋 Cấp đai: <span className="font-bold">{coach.belt_level}/22</span></p>
                  <p>📅 Gia nhập: {coach.join_date}</p>
                  {coach.is_national_rank && (
                    <span className="inline-block bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded border border-red-200 mt-1">
                      Đẳng Quốc Gia
                    </span>
                  )}
                </div>
              </div>

              {/* Edit Button (Chỉ Admin mới thấy) */}
              {isAdmin && (
                <button className="absolute top-2 right-2 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  ✏️
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MODAL THÊM MỚI */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-xl font-bold mb-4 text-red-900 border-b pb-2">Thêm Hồ Sơ Mới</h3>
            
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cột Trái */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium">Họ và Tên</label>
                  <input required className="w-full border p-2 rounded" 
                    value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Email (Tài khoản)</label>
                  <input required type="email" className="w-full border p-2 rounded" 
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Mật khẩu</label>
                  <input required type="password" className="w-full border p-2 rounded" 
                    value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Ngày sinh</label>
                  <input type="date" className="w-full border p-2 rounded" 
                    value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
                </div>
              </div>

              {/* Cột Phải */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium">Ảnh đại diện</label>
                  <input type="file" onChange={handleUpload} className="w-full text-sm text-gray-500"/>
                  {uploading && <p className="text-xs text-blue-500">Đang tải ảnh lên...</p>}
                  {formData.avatar_url && <img src={formData.avatar_url} className="h-20 mt-2 rounded border"/>}
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium">Cấp đai (0-22)</label>
                    <input type="number" max="22" className="w-full border p-2 rounded" 
                      value={formData.belt_level} onChange={e => setFormData({...formData, belt_level: parseInt(e.target.value)})} />
                  </div>
                  <div className="flex items-end pb-3">
                     <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={formData.is_national_rank} 
                          onChange={e => setFormData({...formData, is_national_rank: e.target.checked})} />
                        <span className="text-sm font-medium text-red-700">Đẳng QG</span>
                     </label>
                  </div>
                </div>

                <div>
                   <label className="block text-sm font-medium">Vai trò</label>
                   <select className="w-full border p-2 rounded" 
                     value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                     <option value="instructor">Huấn Luyện Viên</option>
                     <option value="master_head">Trưởng Tràng</option>
                     <option value="admin">Admin Hệ Thống</option>
                   </select>
                </div>

                <div>
                  <label className="block text-sm font-medium">Ngày gia nhập (Tính thâm niên)</label>
                  <input type="date" required className="w-full border p-2 rounded" 
                    value={formData.join_date} onChange={e => setFormData({...formData, join_date: e.target.value})} />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="col-span-1 md:col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Hủy</button>
                <button type="submit" disabled={loading || uploading} className="px-6 py-2 bg-red-800 text-white rounded hover:bg-red-900 font-bold">
                  {loading ? 'Đang lưu...' : 'Lưu Hồ Sơ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
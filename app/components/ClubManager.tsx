'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Club {
  id: string;
  name: string;
  region: string;
  address: string;
}

interface Student {
  id: string;
  full_name: string;
  belt_level: number;
  dob: string;
  join_date: string;
}

export default function ClubManager({ userRole }: { userRole: string }) {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  
  // Modal states
  const [showClubModal, setShowClubModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form Data
  const [clubForm, setClubForm] = useState({ name: '', region: '', address: '' });
  const [studentForm, setStudentForm] = useState({ full_name: '', dob: '', belt_level: 0, join_date: '' });

  const isAdmin = userRole === 'admin' || userRole === 'master_head';

  // 1. Tải danh sách CLB
  useEffect(() => {
    async function fetchClubs() {
      const { data } = await supabase.from('clubs').select('*').order('region');
      if (data) setClubs(data);
    }
    fetchClubs();
  }, []);

  // 2. Tải danh sách Võ sinh khi chọn CLB
  useEffect(() => {
    async function fetchStudents() {
      if (!selectedClub) return;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('club_id', selectedClub.id)
        .eq('role', 'student') // Chỉ lấy võ sinh
        .order('full_name');
      
      if (data) setStudents(data as any);
    }
    fetchStudents();
  }, [selectedClub]);

  // 3. Xử lý Thêm CLB
  const handleAddClub = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('clubs').insert([clubForm]);
    setLoading(false);
    
    if (error) alert('Lỗi: ' + error.message);
    else {
      alert('Đã thêm CLB!');
      setShowClubModal(false);
      // Reload page nhanh
      window.location.reload(); 
    }
  };

  // 4. Xử lý Thêm Võ Sinh (API Admin)
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClub) return;

    setLoading(true);
    // Gọi API create-user nhưng với source là student_tab
    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'student_tab', // Báo hiệu là tạo võ sinh
        fullName: studentForm.full_name,
        role: 'student',
        club_id: selectedClub.id, // Gắn cứng vào CLB này
        ...studentForm
      }),
    });
    
    setLoading(false);
    const result = await res.json();
    
    if (result.success) {
      alert('Đã thêm Võ sinh!');
      setShowStudentModal(false);
      // Refresh list student
      const { data } = await supabase.from('profiles').select('*').eq('club_id', selectedClub.id).eq('role', 'student');
      if (data) setStudents(data as any);
      setStudentForm({ full_name: '', dob: '', belt_level: 0, join_date: '' });
    } else {
      alert('Lỗi: ' + result.error);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[600px] border rounded shadow overflow-hidden">
      
      {/* CỘT TRÁI: DANH SÁCH CLB */}
      <div className="w-full md:w-1/3 bg-gray-50 border-r flex flex-col">
        <div className="p-4 bg-red-900 text-white flex justify-between items-center">
          <h3 className="font-bold">Danh Sách CLB</h3>
          {isAdmin && (
            <button onClick={() => setShowClubModal(true)} className="text-xs bg-yellow-500 text-red-900 px-2 py-1 rounded font-bold hover:bg-yellow-400">
              + Thêm
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {clubs.length === 0 && <p className="text-center p-4 text-gray-500">Chưa có CLB nào.</p>}
          {clubs.map(club => (
            <div 
              key={club.id} 
              onClick={() => setSelectedClub(club)}
              className={`p-4 border-b cursor-pointer hover:bg-red-50 transition-colors ${selectedClub?.id === club.id ? 'bg-red-100 border-l-4 border-l-red-800' : ''}`}
            >
              <h4 className="font-bold text-red-900">{club.name}</h4>
              <p className="text-xs text-gray-600">{club.region} - {club.address}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CỘT PHẢI: CHI TIẾT VÕ SINH */}
      <div className="w-full md:w-2/3 bg-white flex flex-col">
        {!selectedClub ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>⬅ Chọn một CLB để xem danh sách võ sinh</p>
          </div>
        ) : (
          <>
            <div className="p-4 border-b flex justify-between items-center bg-gray-100">
              <div>
                <h3 className="font-bold text-xl text-red-900">{selectedClub.name}</h3>
                <p className="text-xs text-gray-500">Tổng số: {students.length} võ sinh</p>
              </div>
              <button 
                onClick={() => setShowStudentModal(true)}
                className="bg-red-700 text-white px-3 py-1 rounded text-sm hover:bg-red-800"
              >
                + Thêm Võ Sinh
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                  <tr>
                    <th className="px-4 py-3">Họ Tên</th>
                    <th className="px-4 py-3">Cấp Đai</th>
                    <th className="px-4 py-3">Năm Sinh</th>
                    <th className="px-4 py-3">Ngày Nhập Môn</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(st => (
                    <tr key={st.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{st.full_name}</td>
                      <td className="px-4 py-3">{st.belt_level}/22</td>
                      <td className="px-4 py-3">{st.dob}</td>
                      <td className="px-4 py-3">{st.join_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {students.length === 0 && <p className="text-center mt-10 text-gray-400">Chưa có võ sinh nào.</p>}
            </div>
          </>
        )}
      </div>

      {/* MODAL TẠO CLB */}
      {showClubModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={handleAddClub} className="bg-white p-6 rounded shadow-lg w-96">
            <h3 className="font-bold mb-4 text-red-900">Thêm Câu Lạc Bộ Mới</h3>
            <input required placeholder="Tên CLB" className="w-full border p-2 mb-2 rounded" 
              value={clubForm.name} onChange={e => setClubForm({...clubForm, name: e.target.value})} />
            <input required placeholder="Khu vực (VD: Miền Nam)" className="w-full border p-2 mb-2 rounded" 
              value={clubForm.region} onChange={e => setClubForm({...clubForm, region: e.target.value})} />
            <input placeholder="Địa chỉ" className="w-full border p-2 mb-4 rounded" 
              value={clubForm.address} onChange={e => setClubForm({...clubForm, address: e.target.value})} />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowClubModal(false)} className="px-3 py-1 text-gray-500">Hủy</button>
              <button disabled={loading} className="px-3 py-1 bg-red-800 text-white rounded">Lưu</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL TẠO VÕ SINH */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={handleAddStudent} className="bg-white p-6 rounded shadow-lg w-96">
            <h3 className="font-bold mb-4 text-red-900">Thêm Võ Sinh vào {selectedClub?.name}</h3>
            <label className="text-xs font-bold">Họ tên</label>
            <input required className="w-full border p-2 mb-2 rounded" 
              value={studentForm.full_name} onChange={e => setStudentForm({...studentForm, full_name: e.target.value})} />
            
            <label className="text-xs font-bold">Ngày sinh</label>
            <input type="date" required className="w-full border p-2 mb-2 rounded" 
              value={studentForm.dob} onChange={e => setStudentForm({...studentForm, dob: e.target.value})} />
            
            <label className="text-xs font-bold">Cấp đai</label>
            <input type="number" max="22" required className="w-full border p-2 mb-2 rounded" 
              value={studentForm.belt_level} onChange={e => setStudentForm({...studentForm, belt_level: parseInt(e.target.value)})} />
            
            <label className="text-xs font-bold">Ngày nhập môn</label>
            <input type="date" required className="w-full border p-2 mb-4 rounded" 
              value={studentForm.join_date} onChange={e => setStudentForm({...studentForm, join_date: e.target.value})} />

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowStudentModal(false)} className="px-3 py-1 text-gray-500">Hủy</button>
              <button disabled={loading} className="px-3 py-1 bg-red-800 text-white rounded">Thêm</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
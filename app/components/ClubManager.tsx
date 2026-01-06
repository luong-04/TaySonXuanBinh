'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Club {
  id: string;
  name: string;
  region: string;
  address: string;
}

interface Member {
  id: string;
  full_name: string;
  belt_level: number;
  dob: string;
  join_date: string;
  avatar_url: string | null;
  role: string;       
  club_role: string | null; 
  title: string | null;
  club_id: string | null;
  email: string | null;
}

const CLUB_ROLES = ["Trưởng tràng", "HLV Trưởng", "HLV Phó", "Thành viên BHL"];

// --- Component Nhóm Chức Vụ (Giữ nguyên như trước) ---
const RoleGroup = ({ roleName, members, isAdmin, onUnassign, onAdd }: { roleName: string, members: Member[], isAdmin: boolean, onUnassign: (id: string) => void, onAdd: (role: string) => void }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const VISIBLE_LIMIT = 4;
  const displayMembers = isExpanded ? members : members.slice(0, VISIBLE_LIMIT);
  const hiddenCount = members.length - VISIBLE_LIMIT;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden mb-4">
      <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
        <h5 className="font-bold text-sm text-blue-900 uppercase flex items-center gap-2">
          {roleName} <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">{members.length}</span>
        </h5>
        {isAdmin && (
          <button onClick={() => onAdd(roleName)} className="text-xs bg-white border border-blue-200 text-blue-600 px-3 py-1 rounded hover:bg-blue-50 font-bold flex items-center gap-1 transition-colors">
            + Thêm
          </button>
        )}
      </div>
      <div className="p-4">
        {members.length === 0 ? <p className="text-xs text-gray-400 italic text-center py-2">Chưa bổ nhiệm nhân sự.</p> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {displayMembers.map(assignee => (
              <div key={assignee.id} className="flex items-center gap-3 p-2 rounded border border-gray-100 bg-white hover:border-blue-200 hover:shadow-md transition-all relative group">
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-300 shrink-0">
                  <img src={assignee.avatar_url || "https://via.placeholder.com/150"} className="w-full h-full object-cover"/>
                </div>
                <div className="overflow-hidden min-w-0">
                  <p className="font-bold text-sm text-gray-800 truncate" title={assignee.full_name}>{assignee.full_name}</p>
                  <p className="text-[10px] text-gray-500">Đai {assignee.belt_level}/22</p>
                </div>
                {isAdmin && (
                  <button onClick={() => onUnassign(assignee.id)} className="absolute top-1 right-1 text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1" title="Gỡ bỏ">
                    &times;
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {members.length > VISIBLE_LIMIT && (
          <div className="mt-3 text-center border-t border-dashed pt-2">
            <button onClick={() => setIsExpanded(!isExpanded)} className="text-xs text-blue-600 hover:text-blue-800 font-bold hover:underline w-full">
              {isExpanded ? "⬆ Thu gọn lại" : `⬇ Xem thêm ${hiddenCount} người nữa`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default function ClubManager({ userRole }: { userRole: string }) {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [groupedClubs, setGroupedClubs] = useState<Record<string, Club[]>>({});
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [staffs, setStaffs] = useState<Member[]>([]);   
  const [students, setStudents] = useState<Member[]>([]); 
  const [allCoaches, setAllCoaches] = useState<Member[]>([]); 
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [targetRole, setTargetRole] = useState(''); 
  const [searchTerm, setSearchTerm] = useState('');
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showClubModal, setShowClubModal] = useState(false); 
  const [clubForm, setClubForm] = useState({ name: '', region: '', address: '' });
  
  // State Form Võ Sinh (Khởi tạo belt_level là 0)
  const [studentForm, setStudentForm] = useState({ 
      full_name: '', dob: '', belt_level: 0, join_date: ''
  });

  const isAdmin = userRole === 'admin' || userRole === 'master_head';

  useEffect(() => {
    async function fetchClubs() {
      const { data } = await supabase.from('clubs').select('*').order('region');
      if (data) {
          setClubs(data);
          const groups: Record<string, Club[]> = {};
          data.forEach(club => {
              const region = club.region || 'Khác';
              if (!groups[region]) groups[region] = [];
              groups[region].push(club);
          });
          setGroupedClubs(groups);
      }
    }
    fetchClubs();
  }, []);

  useEffect(() => {
    async function fetchMembers() {
      if (!selectedClub) return;
      const { data } = await supabase.from('profiles').select('*').eq('club_id', selectedClub.id).order('belt_level', { ascending: false });
      if (data) {
          const allMembers = data as any as Member[];
          setStaffs(allMembers.filter(m => m.club_role || m.role !== 'student'));
          setStudents(allMembers.filter(m => !m.club_role && m.role === 'student'));
      }
    }
    fetchMembers();
  }, [selectedClub]);

  useEffect(() => {
    async function fetchAllCoaches() {
       const { data } = await supabase.from('profiles').select('*').neq('role', 'student'); 
       if (data) setAllCoaches(data as any as Member[]);
    }
    if(showAssignModal) fetchAllCoaches();
  }, [showAssignModal]);

  const handleOpenAssign = (roleName: string) => {
      setTargetRole(roleName);
      setSearchTerm('');
      setShowAssignModal(true);
  };

  const handleAssignCoach = async (coach: Member) => {
      if (!selectedClub) return;
      if (coach.club_id && coach.club_id !== selectedClub.id) {
          if(!confirm(`HLV ${coach.full_name} đang ở CLB khác. Chuyển về đây?`)) return;
      }
      setLoading(true);
      const res = await fetch('/api/admin/update-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: coach.id, club_id: selectedClub.id, club_role: targetRole }),
      });
      setLoading(false);
      const result = await res.json();
      if (result.success) {
          alert(`Đã thêm ${coach.full_name} vào chức vụ ${targetRole}`);
          setShowAssignModal(false);
          const { data } = await supabase.from('profiles').select('*').eq('club_id', selectedClub.id);
          if (data) {
              const all = data as any as Member[];
              setStaffs(all.filter(m => m.club_role || m.role !== 'student'));
          }
      } else {
          alert('Lỗi: ' + result.error);
      }
  };

  const handleUnassign = async (coachId: string) => {
      if(!confirm("Gỡ HLV này khỏi chức vụ?")) return;
      const res = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: coachId, club_id: null, club_role: null }),
      });
      const result = await res.json();
      if(result.success) setStaffs(prev => prev.filter(p => p.id !== coachId));
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClub) return;

    setLoading(true);
    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'club_student',
        fullName: studentForm.full_name,
        role: 'student', 
        club_id: selectedClub.id,
        // Dữ liệu form (đai, ngày sinh, ngày nhập môn)
        ...studentForm 
      }),
    });
    setLoading(false);
    const result = await res.json();
    if (result.success) {
      alert('Đã thêm Võ sinh!');
      setShowStudentModal(false);
      const { data } = await supabase.from('profiles').select('*').eq('club_id', selectedClub.id).eq('role', 'student').order('belt_level', {ascending: false});
      if (data) setStudents(data as any);
      setStudentForm({ full_name: '', dob: '', belt_level: 0, join_date: '' });
    } else {
      alert('Lỗi: ' + result.error);
    }
  };

   const handleAddClub = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('clubs').insert([clubForm]);
    if (error) alert(error.message);
    else { alert('Xong!'); setShowClubModal(false); window.location.reload(); }
  };

  const filteredCoaches = allCoaches.filter(c => 
      c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-160px)] border rounded-lg shadow-lg overflow-hidden bg-gray-50">
      
      {/* CỘT TRÁI */}
      <div className="w-full md:w-1/4 bg-white border-r flex flex-col">
        <div className="p-4 bg-red-900 text-yellow-50 flex justify-between items-center shadow-md z-10">
          <h3 className="font-bold uppercase text-sm">Danh Sách CLB</h3>
          {isAdmin && <button onClick={() => setShowClubModal(true)} className="text-xs bg-yellow-500 text-red-900 px-2 py-1 rounded font-bold hover:bg-yellow-400">+</button>}
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {Object.keys(groupedClubs).map(region => (
              <div key={region}>
                  <div className="bg-gray-100 px-4 py-2 font-bold text-xs text-gray-600 uppercase border-b border-t sticky top-0">📍 {region}</div>
                  {groupedClubs[region].map(club => (
                      <div key={club.id} onClick={() => setSelectedClub(club)}
                        className={`p-3 border-b cursor-pointer hover:bg-red-50 ${selectedClub?.id === club.id ? 'bg-red-100 border-l-4 border-l-red-800' : ''}`}>
                        <h4 className="font-bold text-sm text-gray-800">{club.name}</h4>
                      </div>
                  ))}
              </div>
          ))}
        </div>
      </div>

      {/* CỘT PHẢI */}
      <div className="w-full md:w-3/4 bg-gray-50 flex flex-col bg-[url('/bg-grid.png')]">
        {!selectedClub ? (
           <div className="flex flex-col items-center justify-center h-full text-gray-400"><p>Chọn một CLB để xem chi tiết</p></div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="p-4 bg-white border-b shadow-sm">
                <h3 className="font-bold text-2xl text-red-900 uppercase">{selectedClub.name}</h3>
                <p className="text-sm text-gray-500">{selectedClub.address}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {/* 1. BAN HUẤN LUYỆN */}
                <section className="space-y-4">
                    <h4 className="font-bold text-lg text-red-900 uppercase flex items-center gap-2 mb-4">
                        <span className="w-1 h-6 bg-red-900 block"></span> Ban Huấn Luyện
                    </h4>
                    {CLUB_ROLES.map(roleName => {
                        const assignees = staffs.filter(s => s.club_role === roleName);
                        return <RoleGroup key={roleName} roleName={roleName} members={assignees} isAdmin={isAdmin} onUnassign={handleUnassign} onAdd={handleOpenAssign} />;
                    })}
                </section>

                {/* 2. DANH SÁCH VÕ SINH */}
                <section>
                    <div className="flex justify-between items-center mb-4 pt-4 border-t">
                        <h4 className="font-bold text-lg text-gray-800 uppercase flex items-center gap-2">
                             <span className="w-1 h-6 bg-gray-600 block"></span> Danh Sách Võ Sinh
                             <span className="text-xs bg-gray-200 px-2 rounded-full">{students.length}</span>
                        </h4>
                        <button onClick={() => setShowStudentModal(true)} className="bg-red-800 text-white text-xs px-3 py-1.5 rounded font-bold hover:bg-red-700">
                            + Thêm Võ Sinh
                        </button>
                    </div>
                    <div className="bg-white rounded border overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 text-xs font-bold uppercase text-gray-600">
                                <tr>
                                    <th className="px-4 py-3">Họ Tên</th>
                                    <th className="px-4 py-3">Cấp Đai</th>
                                    <th className="px-4 py-3">Ngày Sinh</th>
                                    <th className="px-4 py-3">Nhập Môn</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {students.map(st => (
                                    <tr key={st.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium">{st.full_name}</td>
                                        <td className="px-4 py-3">Đai {st.belt_level}</td>
                                        <td className="px-4 py-3 text-gray-500">{st.dob ? new Date(st.dob).toLocaleDateString('vi-VN') : '-'}</td>
                                        <td className="px-4 py-3 text-gray-500">{st.join_date ? new Date(st.join_date).toLocaleDateString('vi-VN') : '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
          </div>
        )}
      </div>

      {/* MODAL GÁN HLV */}
      {showAssignModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md h-125 flex flex-col animate-in zoom-in duration-200">
                  <div className="p-4 border-b bg-blue-50 rounded-t-lg">
                      <h3 className="font-bold text-blue-900 uppercase">Chọn {targetRole}</h3>
                      <input autoFocus placeholder="Gõ tên để tìm nhanh..." className="w-full mt-2 p-2 border rounded focus:border-blue-600 outline-none"
                          value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                      {filteredCoaches.map(c => (
                          <div key={c.id} onClick={() => handleAssignCoach(c)} className="flex items-center gap-3 p-2 hover:bg-blue-100 cursor-pointer rounded border border-transparent hover:border-blue-200 transition-colors">
                              <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden shrink-0"><img src={c.avatar_url || "https://via.placeholder.com/50"} className="w-full h-full object-cover"/></div>
                              <div className="overflow-hidden"><p className="font-bold text-sm truncate">{c.full_name}</p><p className="text-xs text-gray-500 flex gap-1"><span>Đai {c.belt_level}</span>{c.club_id && c.club_id !== selectedClub?.id && <span className="text-red-500">• Ở CLB khác</span>}</p></div>
                          </div>
                      ))}
                      {filteredCoaches.length === 0 && <p className="text-center text-gray-400 mt-4 text-sm">Không tìm thấy.</p>}
                  </div>
                  <button onClick={() => setShowAssignModal(false)} className="p-3 text-gray-500 hover:bg-gray-100 border-t rounded-b-lg font-bold text-sm">Đóng</button>
              </div>
          </div>
      )}

      {/* MODAL THÊM CLB */}
      {showClubModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <form onSubmit={handleAddClub} className="bg-white p-6 rounded shadow-lg w-96">
            <h3 className="font-bold mb-4">Thêm CLB Mới</h3>
            <input required placeholder="Tên CLB" className="w-full border p-2 mb-2 rounded" value={clubForm.name} onChange={e => setClubForm({...clubForm, name: e.target.value})} />
            <input required placeholder="Khu vực" className="w-full border p-2 mb-2 rounded" value={clubForm.region} onChange={e => setClubForm({...clubForm, region: e.target.value})} />
            <input placeholder="Địa chỉ" className="w-full border p-2 mb-4 rounded" value={clubForm.address} onChange={e => setClubForm({...clubForm, address: e.target.value})} />
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowClubModal(false)} className="px-3 py-1 text-gray-500">Hủy</button><button disabled={loading} className="px-3 py-1 bg-red-900 text-white rounded font-bold">Lưu</button></div>
          </form>
        </div>
      )}

      {/* MODAL VÕ SINH - FIX LỖI NHẬP LIỆU */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <form onSubmit={handleAddStudent} className="bg-white p-6 rounded shadow-lg w-96 border-t-4 border-red-900">
            <h3 className="font-bold mb-4 text-red-900 uppercase text-center">Thêm Võ Sinh</h3>
            <div className="space-y-3">
                <input required placeholder="Họ và Tên" className="w-full border p-2 rounded" value={studentForm.full_name} onChange={e => setStudentForm({...studentForm, full_name: e.target.value})} />
                
                <div>
                    <label className="text-xs font-bold text-gray-600">Ngày sinh</label>
                    <input type="date" required className="w-full border p-2 rounded cursor-pointer" value={studentForm.dob} onChange={e => setStudentForm({...studentForm, dob: e.target.value})} />
                </div>
                
                <div>
                    <label className="text-xs font-bold text-gray-600">Cấp đai (0-22)</label>
                    <input type="number" max="22" className="w-full border p-2 rounded" 
                    value={studentForm.belt_level} 
                    onChange={e => setStudentForm({...studentForm, belt_level: parseInt(e.target.value) || 0})} // Fix lỗi NaN
                    />
                </div>

                <div>
                    <label className="text-xs font-bold text-gray-600">Ngày nhập môn</label>
                    <input type="date" required className="w-full border p-2 rounded cursor-pointer" value={studentForm.join_date} onChange={e => setStudentForm({...studentForm, join_date: e.target.value})} />
                </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button type="button" onClick={() => setShowStudentModal(false)} className="px-3 py-1 text-gray-500">Hủy</button>
              <button disabled={loading} className="px-3 py-1 bg-red-900 text-white rounded font-bold">Thêm</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
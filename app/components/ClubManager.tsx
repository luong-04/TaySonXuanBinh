'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
// THÊM: Import thư viện crop ảnh
import Cropper from 'react-easy-crop';

// --- THÊM: CÁC HÀM HỖ TRỢ CẮT ẢNH (Giữ nguyên code cũ, chỉ thêm phần này lên đầu) ---
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
  // Set width/height để output ra ảnh vuông (hoặc theo aspect ratio truyền vào)
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/jpeg', 0.95); // Output dạng JPEG, chất lượng 95%
  });
}
// -------------------------------------------------------------------------


interface Region { id: string; name: string; }
interface Club { id: string; name: string; region: string; address: string; }
interface Member { id: string; full_name: string; belt_level: number; dob: string; join_date: string; avatar_url: string | null; role: string; club_role: string | null; title: string | null; club_id: string | null; email: string | null; }

const CLUB_ROLES = ["Trưởng tràng", "HLV Trưởng", "HLV Phó", "Thành viên BHL"];

const RoleGroup = ({ roleName, members, isAdmin, onUnassign, onAdd }: any) => {
  const [isExpanded, setIsExpanded] = useState(false);
  // Hiển thị nhiều hơn để đỡ phải bấm xem thêm
  const VISIBLE_LIMIT = 8; 
  const displayMembers = isExpanded ? members : members.slice(0, VISIBLE_LIMIT);
  const hiddenCount = members.length - VISIBLE_LIMIT;

  return (
    <div className="bg-white border border-red-200 rounded-lg shadow-sm overflow-hidden mb-4">
      <div className="bg-red-50 px-4 py-3 border-b border-red-100 flex flex-wrap justify-between items-center gap-2">
        <h5 className="font-bold text-sm text-red-900 uppercase flex items-center gap-2 whitespace-normal break-words">
          {roleName} <span className="text-xs bg-red-200 text-red-900 px-2 py-0.5 rounded-full shrink-0">{members.length}</span>
        </h5>
        {isAdmin && (
          <button onClick={() => onAdd(roleName)} className="text-xs bg-white border border-red-300 text-red-700 px-3 py-1 rounded hover:bg-red-100 font-bold transition-colors shrink-0">
            + Thêm
          </button>
        )}
      </div>
      <div className="p-3">
        {members.length === 0 ? <p className="text-xs text-gray-400 italic text-center py-2">Chưa có nhân sự.</p> : (
          /* SỬA QUAN TRỌNG: 
             - Mobile: 1 cột (grid-cols-1) -> Thẻ full width
             - PC: Tối đa 2 cột (lg:grid-cols-2) hoặc 3 cột (2xl:grid-cols-3) -> Thẻ rất rộng, tên nằm ngang thoải mái 
          */
          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-3">
            {displayMembers.map((assignee: any) => (
              <div key={assignee.id} className="flex items-center gap-3 p-3 rounded border border-gray-100 bg-white hover:border-red-300 hover:shadow-md transition-all relative group">
                {/* Avatar to hơn chút để cân đối */}
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-300 shrink-0">
                  <img src={assignee.avatar_url || "https://via.placeholder.com/150"} className="w-full h-full object-cover"/>
                </div>
                <div className="flex-1 min-w-0">
                  {/* Tên hiển thị ngang, xuống dòng nếu cực dài, không bị cắt */}
                  <p className="font-bold text-sm text-gray-800 whitespace-normal break-words leading-snug">{assignee.full_name}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Đai {assignee.belt_level}/22</p>
                </div>
                {isAdmin && (
                  <button onClick={() => onUnassign(assignee.id)} className="text-gray-300 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition-colors shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {members.length > VISIBLE_LIMIT && (
          <button onClick={() => setIsExpanded(!isExpanded)} className="w-full mt-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors text-center font-bold">
            {isExpanded ? "Thu gọn" : `Xem thêm ${hiddenCount} người nữa...`}
          </button>
        )}
      </div>
    </div>
  );
};

export default function ClubManager({ userRole }: { userRole: string }) {
  const [regions, setRegions] = useState<Region[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedRegionName, setSelectedRegionName] = useState<string | null>(null);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [staffs, setStaffs] = useState<Member[]>([]);   
  const [students, setStudents] = useState<Member[]>([]); 
  const [allCoaches, setAllCoaches] = useState<Member[]>([]); 
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Mobile View State
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);

  const [showRegionModal, setShowRegionModal] = useState(false);
  const [showClubModal, setShowClubModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // --- THÊM: States cho chức năng Crop ảnh Võ sinh ---
  const [showStudentCropModal, setShowStudentCropModal] = useState(false);
  const [studentImageSrc, setStudentImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  // ---------------------------------------------------
  
  const [newRegionName, setNewRegionName] = useState('');
  const [clubForm, setClubForm] = useState({ name: '', region: '', address: '' });
  
  const [studentForm, setStudentForm] = useState<{ full_name: string; dob: string; belt_level: string | number; join_date: string; avatar_url: string }>({ 
      full_name: '', dob: '', belt_level: 0, join_date: '', avatar_url: '' 
  });
  
  const [upgradeForm, setUpgradeForm] = useState({ studentId: '', email: '', password: '', fullName: '' });
  const [targetRole, setTargetRole] = useState(''); 
  const [searchTerm, setSearchTerm] = useState(''); 
  const [memberFilter, setMemberFilter] = useState(''); 
  const [clubSearchTerm, setClubSearchTerm] = useState(''); 
  
  const [isEditingStudent, setIsEditingStudent] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [myClubId, setMyClubId] = useState<string | null>(null);

  const isAdmin = userRole === 'admin' || userRole === 'master_head' || userRole === 'grandmaster';
  const canManage = isAdmin || (userRole === 'instructor' && myClubId === selectedClub?.id);

  useEffect(() => {
    const fetchMyProfile = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data } = await supabase.from('profiles').select('club_id').eq('auth_id', session.user.id).single();
            if (data) setMyClubId(data.club_id);
        }
    };
    fetchMyProfile();
  }, []);

  useEffect(() => { fetchRegions(); fetchClubs(); }, []);

  const fetchRegions = async () => {
    const { data } = await supabase.from('regions').select('*').order('name');
    if (data) { setRegions(data); if (data.length > 0 && !selectedRegionName) setSelectedRegionName(data[0].name); }
  };
  const fetchClubs = async () => { const { data } = await supabase.from('clubs').select('*').order('name'); if (data) setClubs(data); };

  useEffect(() => {
    if (!selectedClub) return;
    async function fetchMembers() {
      const { data } = await supabase.from('profiles').select('*').eq('club_id', selectedClub!.id).order('belt_level', { ascending: false });
      if (data) {
          const all = data as any as Member[];
          setStaffs(all.filter(m => m.club_role || m.role !== 'student'));
          setStudents(all.filter(m => !m.club_role && m.role === 'student'));
      }
    }
    fetchMembers();
  }, [selectedClub]);

  useEffect(() => {
    if(showAssignModal) {
        const fetchAllCoaches = async () => {
            const { data } = await supabase.from('profiles').select('*').neq('role', 'student'); 
            if (data) setAllCoaches(data as any as Member[]);
        }
        fetchAllCoaches();
    }
  }, [showAssignModal]);

  const handleAddRegion = async (e: React.FormEvent) => {
      e.preventDefault(); if (!newRegionName.trim()) return;
      const { error } = await supabase.from('regions').insert([{ name: newRegionName }]);
      if (error) alert(error.message); else { alert('Đã thêm khu vực!'); setNewRegionName(''); setShowRegionModal(false); fetchRegions(); }
  };
  const handleAddClub = async (e: React.FormEvent) => {
    e.preventDefault(); const { error } = await supabase.from('clubs').insert([clubForm]);
    if (error) alert(error.message); else { alert('Đã thêm CLB!'); setShowClubModal(false); fetchClubs(); setClubForm({ name: '', region: '', address: '' }); }
  };

  // --- THÊM: Hàm xử lý khi chọn file ảnh (Thay thế hàm upload cũ) ---
  const onStudentFileChange = async (e: any) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      // Đọc file dưới dạng URL để hiển thị trong cropper
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setStudentImageSrc(reader.result?.toString() || null);
        setShowStudentCropModal(true); // Mở modal crop
        setCrop({ x: 0, y: 0 }); // Reset vị trí crop
        setZoom(1); // Reset zoom
      });
      reader.readAsDataURL(file);
      // Reset input file để có thể chọn lại cùng một file nếu muốn
      e.target.value = null;
    }
  };

  // --- THÊM: Hàm callback khi crop xong (lưu lại tọa độ) ---
  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // --- THÊM: Hàm thực hiện cắt ảnh và upload lên Supabase ---
  const handleStudentCropSave = async () => {
    try {
      setUploading(true);
      if (!studentImageSrc || !croppedAreaPixels) {
        alert('Chưa có dữ liệu ảnh để cắt.');
        return;
      }

      // 1. Tạo file ảnh đã cắt từ tọa độ
      const croppedBlob = await getCroppedImg(studentImageSrc, croppedAreaPixels);
      if (!croppedBlob) throw new Error('Lỗi trong quá trình tạo ảnh cắt.');

      // 2. Đặt tên file (dùng timestamp để tránh trùng)
      const fileName = `student-${Date.now()}.jpg`;
      const file = new File([croppedBlob], fileName, { type: 'image/jpeg' });

      // 3. Upload lên Supabase Storage (Bucket 'assets')
      const { error } = await supabase.storage.from('assets').upload(fileName, file);
      if (error) throw error;

      // 4. Lấy URL công khai
      const { data } = supabase.storage.from('assets').getPublicUrl(fileName);

      // 5. Cập nhật vào form và đóng modal crop
      setStudentForm(prev => ({ ...prev, avatar_url: data.publicUrl }));
      setShowStudentCropModal(false);
      setStudentImageSrc(null); // Giải phóng bộ nhớ

    } catch (error: any) {
      console.error('Lỗi upload ảnh:', error);
      alert('Lỗi khi tải ảnh lên: ' + error.message);
    } finally {
      setUploading(false);
    }
  };
  // --------------------------------------------------------------------

  /* HÀM UPLOAD CŨ (ĐÃ ĐƯỢC THAY THẾ BỞI QUY TRÌNH CROP Ở TRÊN)
  const handleUploadStudentAvatar = async (event: any) => {
    try {
      setUploading(true);
      const file = event.target.files[0];
      if (!file) return;
      const fileName = `student-${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('assets').upload(fileName, file);
      if (error) throw error;
      const { data } = supabase.storage.from('assets').getPublicUrl(fileName);
      setStudentForm(prev => ({ ...prev, avatar_url: data.publicUrl }));
    } catch (error) {
      alert('Lỗi upload ảnh!');
    } finally {
      setUploading(false);
    }
  };
  */

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!selectedClub || !canManage) {
        alert("Bạn không có quyền thêm võ sinh vào CLB này!");
        return;
    }
    setLoading(true);
    const url = isEditingStudent ? '/api/admin/update-user/' : '/api/admin/create-user/';
    const body: any = { 
        fullName: studentForm.full_name, 
        dob: studentForm.dob, 
        join_date: studentForm.join_date, 
        belt_level: Number(studentForm.belt_level) || 0,
        avatar_url: studentForm.avatar_url 
    };
    if (isEditingStudent) { body.id = editingStudentId; } else { body.source = 'club_student'; body.role = 'student'; body.club_id = selectedClub.id; }
    
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), });
    setLoading(false); const result = await res.json();
    if (result.success) {
      alert(isEditingStudent ? 'Cập nhật thành công!' : 'Đã thêm Võ sinh!'); setShowStudentModal(false);
      const { data } = await supabase.from('profiles').select('*').eq('club_id', selectedClub.id).order('belt_level', { ascending: false });
      if (data) { const all = data as any as Member[]; setStaffs(all.filter(m => m.club_role || m.role !== 'student')); setStudents(all.filter(m => !m.club_role && m.role === 'student')); }
    } else alert('Lỗi: ' + result.error);
  };
  
  const handleDeleteStudent = async (studentId: string, name: string) => { 
      if (!canManage) return;
      if(!confirm(`Xóa võ sinh "${name}"?`)) return; 
      const res = await fetch('/api/admin/delete-user/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: studentId }), }); const result = await res.json(); 
      if(result.success) setStudents(prev => prev.filter(s => s.id !== studentId)); else alert(result.error); 
  }
  
  const handleAssignCoach = async (coach: Member) => { 
      if (!selectedClub) return; 
      if (!confirm(`Xác nhận bổ nhiệm HLV "${coach.full_name}" vào vị trí "${targetRole}"?`)) return;

      setLoading(true); 
      const res = await fetch('/api/admin/update-user/', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ id: coach.id, club_id: selectedClub.id, club_role: targetRole }), 
      }); 
      setLoading(false); 
      const result = await res.json(); 
      if (result.success) { 
          setShowAssignModal(false); 
          const { data } = await supabase.from('profiles').select('*').eq('club_id', selectedClub.id); 
          if (data) { 
              const all = data as any as Member[]; 
              setStaffs(all.filter(m => m.club_role || m.role !== 'student')); 
          } 
      } else alert(result.error); 
  };

  const handleUnassign = async (coachId: string) => { if(!confirm("Gỡ chức vụ này?")) return; const res = await fetch('/api/admin/update-user/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: coachId, club_id: null, club_role: null }), }); const result = await res.json(); if(result.success) setStaffs(prev => prev.filter(p => p.id !== coachId)); };
  const handleUpgrade = async (e: React.FormEvent) => { e.preventDefault(); setLoading(true); const res = await fetch('/api/admin/upgrade-student/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId: upgradeForm.studentId, email: upgradeForm.email, password: upgradeForm.password }), }); setLoading(false); const result = await res.json(); if(result.success) { alert('Nâng cấp thành công!'); setShowUpgradeModal(false); } else alert(result.error); }
  
  const filteredClubs = clubs.filter(c => 
      c.region === selectedRegionName && 
      (c.name.toLowerCase().includes(clubSearchTerm.toLowerCase()) || 
       c.address?.toLowerCase().includes(clubSearchTerm.toLowerCase()))
  );

  const filteredCoachesInModal = allCoaches.filter(c => c.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredStaffs = staffs.filter(s => s.full_name.toLowerCase().includes(memberFilter.toLowerCase()));
  const filteredStudents = students.filter(s => s.full_name.toLowerCase().includes(memberFilter.toLowerCase()));

  // Chuyển view Mobile
  const handleSelectClub = (club: Club) => {
      setSelectedClub(club);
      setIsMobileDetailOpen(true);
  };

  const handleBackToList = () => {
      setIsMobileDetailOpen(false);
  };

  const handleSelectRegion = (name: string) => {
      setSelectedRegionName(name);
      setSelectedClub(null);
      setClubSearchTerm('');
      setIsMobileDetailOpen(false);
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-stone-100 overflow-hidden relative">
      <div className="flex-1 flex flex-col min-w-0 bg-stone-50">
          
          {/* TOP BAR */}
          <div className={`${isMobileDetailOpen ? 'hidden md:flex' : 'flex'} h-14 bg-white border-b border-gray-300 shadow-sm items-center px-4 gap-4 z-10 shrink-0 overflow-x-auto`}>
              <span className="font-bold text-red-900 uppercase text-xs whitespace-nowrap">Khu vực:</span>
              <div className="flex gap-2">
                  {regions.map(r => (
                      <button key={r.id} onClick={() => handleSelectRegion(r.name)} className={`px-4 py-1.5 rounded-full text-xs md:text-sm font-bold transition-all whitespace-nowrap border ${selectedRegionName === r.name ? 'bg-red-900 text-yellow-50 border-red-900 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-red-300 hover:text-red-800'}`}>{r.name}</button>
                  ))}
              </div>
              {isAdmin && <button onClick={() => setShowRegionModal(true)} className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600 flex items-center justify-center font-bold border border-dashed border-gray-300 transition-colors shrink-0" title="Thêm khu vực">+</button>}
          </div>

          {/* SỬA: min-h-0 quan trọng để cuộn hoạt động trong Flexbox cha */}
          <div className="flex-1 flex overflow-hidden relative min-h-0">
              
              {/* === DANH SÁCH CLB === */}
              <div className={`${isMobileDetailOpen ? 'hidden' : 'flex'} w-full md:flex md:w-64 bg-white border-r border-gray-200 flex-col shrink-0 h-full`}>
                  <div className="p-3 bg-gray-50 border-b flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-gray-500 uppercase whitespace-normal break-words">CLB tại {selectedRegionName}</span>
                          {isAdmin && <button onClick={() => { setClubForm(prev => ({...prev, region: selectedRegionName || ''})); setShowClubModal(true); }} className="text-xs text-red-700 font-bold hover:underline shrink-0">+ Tạo mới</button>}
                      </div>
                      <div className="relative">
                          <input type="text" placeholder="Tìm tên hoặc địa chỉ..." className="w-full pl-8 pr-2 py-1.5 rounded border border-gray-300 bg-white text-xs focus:border-red-800 focus:ring-1 focus:ring-red-800 outline-none transition-all" value={clubSearchTerm} onChange={(e) => setClubSearchTerm(e.target.value)} />
                          <svg className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      </div>
                  </div>
                  {/* SỬA: min-h-0 để scroll mượt */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar min-h-0">
                      {filteredClubs.length === 0 && <p className="text-center text-xs text-gray-400 mt-4">Không tìm thấy CLB.</p>}
                      {filteredClubs.map(club => (
                          <div key={club.id} onClick={() => handleSelectClub(club)} className={`p-3 rounded border cursor-pointer transition-all ${selectedClub?.id === club.id ? 'bg-red-50 border-red-300 shadow-sm' : 'bg-white border-transparent hover:border-gray-200 hover:bg-gray-50'}`}>
                              <h4 className={`font-bold text-sm whitespace-normal break-words leading-tight ${selectedClub?.id === club.id ? 'text-red-800' : 'text-gray-700'}`}>{club.name}</h4>
                              <p className="text-[10px] text-gray-400 whitespace-normal break-words mt-1 leading-tight">{club.address}</p>
                          </div>
                      ))}
                  </div>
              </div>

              {/* === CHI TIẾT CLB === */}
              <div className={`${isMobileDetailOpen ? 'flex' : 'hidden'} md:flex flex-1 flex-col bg-[url('/bg-grid.png')] bg-stone-50 h-full overflow-hidden absolute inset-0 md:static z-20 md:z-auto`}>
                  
                  {/* Nút quay lại (Mobile Only) */}
                  {selectedClub && (
                      <div className="md:hidden bg-white border-b px-4 py-3 flex items-center gap-2 text-stone-600 shadow-sm z-30 sticky top-0 shrink-0">
                          <button onClick={handleBackToList} className="flex items-center gap-1 text-sm font-bold hover:text-red-900 w-full">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                              Quay lại danh sách
                          </button>
                      </div>
                  )}

                  {/* SỬA: min-h-0 để scroll mượt nội dung chi tiết */}
                  <div className="flex-1 overflow-y-auto p-4 md:p-6 relative custom-scrollbar min-h-0">
                      {!selectedClub ? (
                          <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-50"><div className="text-6xl mb-2">⛩</div><p>Chọn một CLB để quản lý</p></div>
                      ) : (
                          <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 pb-32">
                              {/* Header Chi tiết */}
                              <div className="bg-white p-4 md:p-6 rounded-lg shadow-md border-t-4 border-red-800 flex flex-col justify-between gap-4">
                                  <div>
                                      <h1 className="text-xl md:text-3xl font-bold text-red-900 uppercase font-serif mb-1 whitespace-normal break-words leading-tight">{selectedClub.name}</h1>
                                      <p className="text-gray-600 flex items-start gap-2 text-xs md:text-sm whitespace-normal break-words mt-2"><span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-bold shrink-0">{selectedClub.region}</span><span className="leading-snug">📍 {selectedClub.address}</span></p>
                                  </div>
                                  <div className="relative w-full">
                                      <input type="text" placeholder="Tìm thành viên..." className="w-full pl-9 pr-4 py-2 rounded-full border border-gray-200 bg-gray-50 focus:border-red-800 focus:bg-white outline-none text-sm transition-all" value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)} />
                                      <svg className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                  </div>
                              </div>

                              {/* Ban Huấn Luyện */}
                              <div>
                                  <h3 className="text-base md:text-lg font-bold text-gray-800 uppercase mb-3 flex items-center gap-2"><span className="w-1.5 h-5 bg-red-800"></span> Ban Chấp Hành & Huấn Luyện</h3>
                                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                      {CLUB_ROLES.map(role => {
                                          const members = filteredStaffs.filter(s => s.club_role === role);
                                          return <RoleGroup key={role} roleName={role} members={members} isAdmin={isAdmin} onUnassign={handleUnassign} onAdd={() => { setTargetRole(role); setSearchTerm(''); setShowAssignModal(true); }} />;
                                      })}
                                  </div>
                              </div>

                              {/* Danh Sách Võ Sinh */}
                              <div>
                                  <div className="flex justify-between items-center mb-3 border-b pb-2">
                                      <h3 className="text-base md:text-lg font-bold text-gray-800 uppercase flex items-center gap-2 whitespace-normal"><span className="w-1.5 h-5 bg-gray-600 shrink-0"></span> <span className="flex-1">Danh Sách Võ Sinh <span className="text-xs md:text-sm bg-gray-200 px-2 rounded-full font-normal ml-1">{filteredStudents.length}</span></span></h3>
                                      {canManage && <button onClick={() => { setIsEditingStudent(false); setStudentForm({full_name: '', dob: '', belt_level: 0, join_date: '', avatar_url: ''}); setShowStudentModal(true); }} className="bg-red-800 hover:bg-red-700 text-white px-3 py-1.5 rounded shadow font-bold text-xs flex items-center gap-1 shrink-0 whitespace-nowrap">+ Thêm</button>}
                                  </div>
                                  <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left min-w-[500px]">
                                            <thead className="bg-gray-100 text-gray-600 font-bold uppercase text-xs">
                                                <tr>
                                                    <th className="px-4 py-3 text-center w-14">Ảnh</th>
                                                    <th className="px-4 py-3">Họ Tên</th>
                                                    <th className="px-4 py-3 text-center w-16">Đai</th>
                                                    <th className="px-4 py-3 w-24">Năm Sinh</th>
                                                    <th className="px-4 py-3 text-right w-28">Thao Tác</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {filteredStudents.map(st => (
                                                    <tr key={st.id} className="hover:bg-red-50 transition-colors group">
                                                        <td className="px-4 py-2 text-center">
                                                            <div className="w-8 h-8 rounded-full bg-gray-200 border border-gray-300 mx-auto overflow-hidden">
                                                                <img src={st.avatar_url || "https://via.placeholder.com/50"} className="w-full h-full object-cover"/>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2 font-medium text-gray-900 whitespace-normal break-words leading-tight">{st.full_name}</td>
                                                        <td className="px-4 py-2 text-center"><span className="bg-gray-100 px-2 py-0.5 rounded font-mono font-bold text-xs">{st.belt_level}</span></td>
                                                        <td className="px-4 py-2 text-gray-500 whitespace-nowrap text-xs">{st.dob ? new Date(st.dob).getFullYear() : '-'}</td>
                                                        <td className="px-4 py-2 text-right">
                                                            <div className="flex justify-end gap-1 opacity-100 md:opacity-60 group-hover:opacity-100 transition-opacity">
                                                                {canManage && (
                                                                    <>
                                                                        <button onClick={() => { setIsEditingStudent(true); setEditingStudentId(st.id); setStudentForm({full_name: st.full_name, dob: st.dob || '', belt_level: st.belt_level, join_date: st.join_date || '', avatar_url: st.avatar_url || ''}); setShowStudentModal(true); }} className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-xs font-bold border border-transparent hover:border-blue-200">Sửa</button>
                                                                        <button onClick={() => handleDeleteStudent(st.id, st.full_name)} className="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-xs font-bold border border-transparent hover:border-red-200">Xóa</button>
                                                                    </>
                                                                )}
                                                                {isAdmin && <button onClick={() => { setUpgradeForm({ studentId: st.id, fullName: st.full_name, email: '', password: '' }); setShowUpgradeModal(true); }} className="text-purple-600 hover:bg-purple-50 px-2 py-1 rounded text-xs font-bold border border-transparent hover:border-purple-200 whitespace-nowrap" title="Cấp tài khoản HLV">⬆ HLV</button>}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {filteredStudents.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400 italic">Chưa có dữ liệu võ sinh (hoặc không tìm thấy).</td></tr>}
                                            </tbody>
                                        </table>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      </div>

      {/* --- CÁC MODAL --- */}
      {showRegionModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
              <form onSubmit={handleAddRegion} className="bg-white p-6 rounded shadow-lg w-full max-w-xs animate-in zoom-in duration-200">
                  <h3 className="font-bold mb-4 text-red-900">Thêm Khu Vực Mới</h3>
                  <input autoFocus placeholder="Tên khu vực (vd: Miền Trung)" className="w-full border p-2 rounded mb-4 focus:border-red-800 outline-none" value={newRegionName} onChange={e => setNewRegionName(e.target.value)} />
                  <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowRegionModal(false)} className="px-3 py-1 text-gray-500 hover:bg-gray-100 rounded">Hủy</button><button className="px-4 py-1 bg-red-900 text-white rounded font-bold shadow">Lưu</button></div>
              </form>
          </div>
      )}

      {showClubModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
              <form onSubmit={handleAddClub} className="bg-white p-6 rounded shadow-lg w-full max-w-sm animate-in zoom-in duration-200">
                  <h3 className="font-bold mb-4 text-red-900 uppercase">Thêm CLB Mới</h3>
                  <div className="space-y-3">
                      <div><label className="text-xs font-bold text-gray-500">Tên CLB</label><input required className="w-full border p-2 rounded focus:border-red-800 outline-none" value={clubForm.name} onChange={e => setClubForm({...clubForm, name: e.target.value})} /></div>
                      <div><label className="text-xs font-bold text-gray-500">Khu vực</label><select className="w-full border p-2 rounded focus:border-red-800 outline-none" value={clubForm.region} onChange={e => setClubForm({...clubForm, region: e.target.value})}><option value="">-- Chọn khu vực --</option>{regions.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}</select></div>
                      <div><label className="text-xs font-bold text-gray-500">Địa chỉ</label><input className="w-full border p-2 rounded focus:border-red-800 outline-none" value={clubForm.address} onChange={e => setClubForm({...clubForm, address: e.target.value})} /></div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6"><button type="button" onClick={() => setShowClubModal(false)} className="px-3 py-1 text-gray-500 hover:bg-gray-100 rounded">Hủy</button><button className="px-4 py-1 bg-red-900 text-white rounded font-bold shadow">Lưu</button></div>
              </form>
          </div>
      )}

      {showStudentModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
              {/* SỬA: Thêm position relative để chứa modal crop */}
              <form onSubmit={handleSaveStudent} className="bg-white p-6 rounded shadow-lg w-full max-w-sm border-t-4 border-red-900 animate-in zoom-in duration-200 relative">
                  <h3 className="font-bold mb-4 text-red-900 uppercase text-center">{isEditingStudent ? 'Cập Nhật' : 'Thêm Võ Sinh'}</h3>
                  <div className="flex justify-center mb-4">
                      {/* SỬA: Thay đổi sự kiện onChange để gọi hàm crop */}
                      <label className="cursor-pointer group relative w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden hover:border-red-500 transition-colors">
                          {studentForm.avatar_url ? (
                              <img src={studentForm.avatar_url} className="w-full h-full object-cover"/>
                          ) : <span className="text-2xl text-gray-400 font-light">+</span>}
                          <input type="file" className="hidden" accept="image/*" onChange={onStudentFileChange} />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-[8px] text-white font-bold uppercase">Đổi ảnh</span></div>
                      </label>
                  </div>
                  <div className="space-y-3">
                      <input required placeholder="Họ và Tên" className="w-full border p-2 rounded focus:border-red-800 outline-none" value={studentForm.full_name} onChange={e => setStudentForm({...studentForm, full_name: e.target.value})} />
                      <div><label className="text-xs font-bold text-gray-500">Ngày sinh</label><input type="date" className="w-full border p-2 rounded cursor-pointer" value={studentForm.dob} onChange={e => setStudentForm({...studentForm, dob: e.target.value})} /></div>
                      <div>
                          <label className="text-xs font-bold text-gray-500">Cấp đai (0-22)</label>
                          <input type="number" min="0" max="22" disabled={!isAdmin} className={`w-full border p-2 rounded ${!isAdmin ? 'bg-gray-100 text-gray-400' : ''}`} value={studentForm.belt_level} onChange={e => setStudentForm({...studentForm, belt_level: e.target.value})} />
                          {!isAdmin && <p className="text-[10px] text-red-500 italic">* Liên hệ Admin để sửa đai</p>}
                      </div>
                      <div><label className="text-xs font-bold text-gray-500">Ngày nhập môn</label><input type="date" required className="w-full border p-2 rounded cursor-pointer" value={studentForm.join_date} onChange={e => setStudentForm({...studentForm, join_date: e.target.value})} /></div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6"><button type="button" onClick={() => setShowStudentModal(false)} className="px-3 py-1 text-gray-500 hover:bg-gray-100 rounded">Hủy</button><button disabled={loading || uploading} className="px-4 py-1 bg-red-900 text-white rounded font-bold shadow">{loading || uploading ? '...' : 'Lưu'}</button></div>
                  
                  {/* --- THÊM: MODAL CẮT ẢNH NẰM ĐÈ LÊN MODAL VÕ SINH --- */}
                  {showStudentCropModal && studentImageSrc && (
                    <div className="absolute inset-0 bg-white rounded-lg z-20 flex flex-col animate-in fade-in duration-200 overflow-hidden">
                        <div className="p-3 bg-stone-100 border-b flex justify-between items-center">
                            <h4 className="font-bold text-stone-700 text-sm uppercase">Căn chỉnh ảnh</h4>
                            <button type="button" onClick={() => { setShowStudentCropModal(false); setStudentImageSrc(null); }} className="text-stone-400 hover:text-red-500 text-xl leading-none">&times;</button>
                        </div>
                        <div className="relative flex-1 bg-stone-900 overflow-hidden">
                            <Cropper
                                image={studentImageSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={1} // Hình vuông
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                                objectFit="contain"
                            />
                        </div>
                        <div className="p-3 bg-white border-t space-y-3">
                             <div className="flex items-center gap-2">
                                <span className="text-xs text-stone-500 font-bold shrink-0">Zoom:</span>
                                <input
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    aria-labelledby="Zoom"
                                    onChange={(e) => setZoom(Number(e.target.value))}
                                    className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-red-800"
                                />
                             </div>
                             <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => { setShowStudentCropModal(false); setStudentImageSrc(null); }} className="px-3 py-1.5 text-xs text-stone-500 font-bold hover:bg-stone-100 rounded">Hủy bỏ</button>
                                <button type="button" onClick={handleStudentCropSave} disabled={uploading} className="px-4 py-1.5 text-xs bg-red-900 text-white rounded font-bold hover:bg-red-800 shadow">{uploading ? 'Đang xử lý...' : 'Cắt & Sử dụng'}</button>
                             </div>
                        </div>
                    </div>
                  )}
                  {/* -------------------------------------------------- */}

              </form>
          </div>
      )}

      {showAssignModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md h-[500px] flex flex-col animate-in zoom-in duration-200">
                  <div className="p-4 border-b bg-red-50 rounded-t-lg"><h3 className="font-bold text-red-900 uppercase">Chọn {targetRole}</h3><input autoFocus placeholder="Gõ tên để tìm nhanh..." className="w-full mt-2 p-2 border rounded focus:border-red-800 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                      {filteredCoachesInModal.map((c: any) => (
                          <div key={c.id} className="flex items-center gap-3 p-2 hover:bg-red-50 rounded border border-transparent hover:border-red-200 transition-colors group justify-between">
                              <div className="flex items-center gap-3 overflow-hidden">
                                  <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden shrink-0"><img src={c.avatar_url || "https://via.placeholder.com/50"} className="w-full h-full object-cover"/></div>
                                  <div className="overflow-hidden">
                                      <p className="font-bold text-sm whitespace-normal break-words">{c.full_name}</p>
                                      <p className="text-xs text-gray-500 flex gap-1 flex-wrap"><span>Đai {c.belt_level}</span>{c.club_id && c.club_id !== selectedClub?.id && <span className="text-red-500">• Ở CLB khác</span>}</p>
                                  </div>
                              </div>
                              <button 
                                  onClick={() => handleAssignCoach(c)}
                                  className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold hover:bg-red-600 hover:text-white transition-colors shrink-0"
                                  title="Thêm vào chức vụ này"
                              >
                                  +
                              </button>
                          </div>
                      ))}
                  </div>
                  <button onClick={() => setShowAssignModal(false)} className="p-3 text-gray-500 hover:bg-gray-100 border-t rounded-b-lg font-bold text-sm">Đóng</button>
              </div>
          </div>
      )}

      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg w-full max-w-sm border-t-8 border-purple-600 shadow-2xl animate-in zoom-in duration-200">
                <h3 className="font-bold text-lg text-purple-900 mb-2 uppercase">Nâng HLV</h3>
                <p className="text-sm text-gray-600 mb-4 whitespace-normal break-words">Nâng quyền cho: <span className="font-bold text-black">{upgradeForm.fullName}</span></p>
                <form onSubmit={handleUpgrade} className="space-y-3">
                    <div><label className="block text-xs font-bold text-gray-700">Email mới (*)</label><input type="email" required className="w-full border p-2 rounded outline-none focus:border-purple-600" value={upgradeForm.email} onChange={e => setUpgradeForm({...upgradeForm, email: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold text-gray-700">Mật khẩu (*)</label><input type="text" required className="w-full border p-2 rounded outline-none focus:border-purple-600" value={upgradeForm.password} onChange={e => setUpgradeForm({...upgradeForm, password: e.target.value})} /></div>
                    <div className="flex justify-end gap-2 mt-4"><button type="button" onClick={() => setShowUpgradeModal(false)} className="px-3 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded">Hủy</button><button type="submit" disabled={loading} className="px-4 py-2 bg-purple-700 text-white rounded font-bold hover:bg-purple-800 shadow">Xác nhận</button></div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}
'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Interface
interface Document { 
  id: string; 
  title: string; 
  video_url: string; 
  visibility: 'public' | 'authenticated' | 'private'; 
  created_at: string; 
}

const getYouTubeId = (url: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

// --- HÀM FIX DATE SAFARI ---
const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '';
  // Cắt lấy YYYY-MM-DD
  const isoDate = String(dateStr).substring(0, 10);
  const [year, month, day] = isoDate.split('-');
  
  if (!year || !month || !day) return '';
  
  // Trả về Ngày/Tháng/Năm
  return `${day}/${month}/${year}`;
};

export default function DocumentManager({ userRole }: { userRole: string }) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'authenticated' | 'private'>('public');
  
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const isAdmin = userRole === 'admin' || userRole === 'master_head';

  useEffect(() => { 
      setIsMounted(true);
      fetchDocs(); 
  }, []);

  const fetchDocs = async () => {
    let query = supabase.from('documents').select('*').order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) console.error('Lỗi tải tài liệu:', error);
    else {
      let filteredData = data as Document[];
      if (!isAdmin) {
        if (userRole) {
            filteredData = filteredData.filter(d => d.visibility !== 'private');
        } else {
            filteredData = filteredData.filter(d => d.visibility === 'public');
        }
      }
      setDocs(filteredData);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { title, video_url: videoUrl, visibility };

    if (isEditing && editId) {
      const { error } = await supabase.from('documents').update(payload).eq('id', editId);
      if (!error) {
        setDocs(docs.map(d => d.id === editId ? { ...d, ...payload, id: editId, created_at: d.created_at } : d));
        resetForm();
      }
    } else {
      const { data, error } = await supabase.from('documents').insert([payload]).select();
      if (!error && data) {
        setDocs([data[0] as Document, ...docs]);
        resetForm();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa video này?')) return;
    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (!error) setDocs(docs.filter(d => d.id !== id));
  };

  const openEdit = (doc: Document) => {
    setTitle(doc.title);
    setVideoUrl(doc.video_url);
    setVisibility(doc.visibility || 'public');
    setEditId(doc.id);
    setIsEditing(true);
    setShowModal(true);
  };

  const resetForm = () => {
    setTitle('');
    setVideoUrl('');
    setVisibility('public');
    setEditId(null);
    setIsEditing(false);
    setShowModal(false);
  };

  const getVisibilityLabel = (v: string) => {
    switch(v) {
        case 'private': return <span className="bg-red-100 text-red-800 text-[10px] sm:text-xs px-2 py-1 rounded-full font-bold border border-red-200">Riêng tư</span>;
        case 'authenticated': return <span className="bg-blue-100 text-blue-800 text-[10px] sm:text-xs px-2 py-1 rounded-full font-bold border border-blue-200">Nội bộ</span>;
        default: return <span className="bg-green-100 text-green-800 text-[10px] sm:text-xs px-2 py-1 rounded-full font-bold border border-green-200">Công khai</span>;
    }
  }

  if (!isMounted) return null;

  const filteredDocs = docs.filter(doc => 
    doc.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
      {/* HEADER */}
      <div className="p-4 sm:p-6 border-b border-stone-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-stone-50/50">
        <h2 className="text-lg sm:text-xl font-bold text-red-900 font-serif flex items-center gap-2">
          📚 Tư Liệu
          <span className="text-stone-400 text-sm font-sans font-normal">({docs.length})</span>
        </h2>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <input 
            placeholder="Tìm kiếm..." 
            className="w-full sm:w-64 px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-red-800 transition-all shadow-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {isAdmin && (
            <button 
              onClick={() => setShowModal(true)}
              className="w-full sm:w-auto bg-red-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-red-800 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap"
            >
              + Thêm
            </button>
          )}
        </div>
      </div>

      {/* GRID LIST */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 p-4 sm:p-6">
        {filteredDocs.map((doc) => {
           const ytid = getYouTubeId(doc.video_url);
           return (
            <div key={doc.id} className="group relative bg-white border border-stone-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300">
              {isAdmin && (
                  <div className="absolute top-2 left-2 z-10 shadow-sm">
                      {getVisibilityLabel(doc.visibility)}
                  </div>
              )}

              <div className="aspect-video bg-stone-100 relative overflow-hidden">
                {ytid ? (
                  <iframe 
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${ytid}`}
                    title={doc.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-400 bg-stone-100 text-sm">
                    Không có video
                  </div>
                )}
              </div>
              
              <div className="p-3 sm:p-4">
                <h3 className="font-bold text-stone-800 mb-1 line-clamp-2 min-h-[2.5rem] text-sm sm:text-base group-hover:text-red-900 transition-colors">
                  {doc.title}
                </h3>
                {/* SỬA NGÀY THÁNG Ở ĐÂY */}
                <p className="text-xs text-stone-500 mb-3">
                    {formatDate(doc.created_at)}
                </p>

                {isAdmin && (
                  <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                     <button onClick={() => openEdit(doc)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors active:scale-95">📝</button>
                     <button onClick={() => handleDelete(doc.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors active:scale-95">🗑️</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {filteredDocs.length === 0 && <div className="col-span-full text-center py-12 text-stone-400 text-sm">Chưa có tư liệu nào.</div>}
      </div>

      {/* MODAL FORM */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-stone-100 bg-stone-50 flex justify-between items-center flex-shrink-0">
                <h3 className="font-bold text-lg text-red-900">{isEditing ? 'Cập Nhật' : 'Đăng Mới'}</h3>
                <button onClick={resetForm} className="text-stone-400 hover:text-red-900 p-2">✕</button>
            </div>
            <div className="overflow-y-auto p-5 sm:p-6 space-y-5">
              <form id="docForm" onSubmit={handleSave} className="space-y-4">
                <div><label className="block text-xs font-bold text-stone-500 mb-1 uppercase">Tiêu đề</label><input required className="w-full border border-stone-200 p-3 rounded-xl focus:border-red-800 focus:ring-1 focus:ring-red-800 outline-none transition-all text-sm" value={title} onChange={e => setTitle(e.target.value)} placeholder="Nhập tiêu đề..." /></div>
                <div><label className="block text-xs font-bold text-stone-500 mb-1 uppercase">Youtube Link</label><input required className="w-full border border-stone-200 p-3 rounded-xl focus:border-red-800 focus:ring-1 focus:ring-red-800 outline-none transition-all text-sm" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://youtube.com/..." /></div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-2 uppercase">Quyền xem</label>
                  <div className="flex flex-col gap-2">
                      <label className={`flex items-center p-3 border rounded-xl cursor-pointer transition-all ${visibility === 'public' ? 'border-green-500 bg-green-50' : 'border-stone-100 hover:bg-stone-50'}`}><input type="radio" name="visibility" value="public" checked={visibility === 'public'} onChange={() => setVisibility('public')} className="mr-3 accent-green-600 h-5 w-5"/><div><div className={`font-bold text-sm ${visibility === 'public' ? 'text-green-800' : 'text-stone-700'}`}>🌐 Công khai</div><div className="text-[11px] text-stone-500">Ai cũng xem được</div></div></label>
                      <label className={`flex items-center p-3 border rounded-xl cursor-pointer transition-all ${visibility === 'authenticated' ? 'border-blue-500 bg-blue-50' : 'border-stone-100 hover:bg-stone-50'}`}><input type="radio" name="visibility" value="authenticated" checked={visibility === 'authenticated'} onChange={() => setVisibility('authenticated')} className="mr-3 accent-blue-600 h-5 w-5"/><div><div className={`font-bold text-sm ${visibility === 'authenticated' ? 'text-blue-800' : 'text-stone-700'}`}>🔒 Nội bộ</div><div className="text-[11px] text-stone-500">Cần đăng nhập</div></div></label>
                      <label className={`flex items-center p-3 border rounded-xl cursor-pointer transition-all ${visibility === 'private' ? 'border-red-500 bg-red-50' : 'border-stone-100 hover:bg-stone-50'}`}><input type="radio" name="visibility" value="private" checked={visibility === 'private'} onChange={() => setVisibility('private')} className="mr-3 accent-red-600 h-5 w-5"/><div><div className={`font-bold text-sm ${visibility === 'private' ? 'text-red-800' : 'text-stone-700'}`}>🚫 Riêng tư</div><div className="text-[11px] text-stone-500">Chỉ Admin & Trưởng tràng</div></div></label>
                  </div>
                </div>
              </form>
            </div>
            <div className="p-4 border-t border-stone-100 bg-stone-50 flex justify-end gap-3 flex-shrink-0">
                <button type="button" onClick={resetForm} className="px-5 py-2.5 text-stone-500 hover:bg-stone-100 rounded-xl font-bold transition-colors text-sm">Hủy</button>
                <button type="submit" form="docForm" className="px-5 py-2.5 bg-red-900 text-white rounded-xl font-bold hover:bg-red-800 shadow-md transition-all active:scale-95 text-sm">{isEditing ? 'Lưu' : 'Đăng'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Document { id: string; title: string; video_url: string; created_at: string; }

const getYouTubeId = (url: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export default function DocumentManager({ userRole }: { userRole: string }) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const isAdmin = userRole === 'admin' || userRole === 'master_head';

  useEffect(() => { 
      setIsMounted(true);
      fetchDocs(); 
  }, []);

  const fetchDocs = async () => {
    const { data } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
    if (data) setDocs(data);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !videoUrl.trim()) { alert("Vui lòng nhập đủ thông tin!"); return; }

    if (!getYouTubeId(videoUrl)) {
        alert("Link YouTube không hợp lệ!");
        return;
    }

    try {
        if (isEditing && editId) {
            // FIX: Đảm bảo sử dụng đúng editId trong câu lệnh update
            const { error } = await supabase
                .from('documents')
                .update({ 
                    title: title.trim(), 
                    video_url: videoUrl.trim() 
                })
                .match({ id: editId }); // Sử dụng match hoặc eq để xác định bản ghi

            if (error) throw error;
            alert('Đã cập nhật video thành công!');
        } else {
            const { error } = await supabase
                .from('documents')
                .insert([{ 
                    title: title.trim(), 
                    video_url: videoUrl.trim() 
                }]);
            
            if (error) throw error;
            alert('Đã đăng video thành công!');
        }
        
        setShowModal(false); 
        setTitle('');
        setVideoUrl('');
        setEditId(null);
        fetchDocs(); // Tải lại danh sách mới
    } catch (error: any) { 
        alert('Lỗi cập nhật: ' + error.message); 
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa video này vĩnh viễn?')) return;
    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (error) alert("Lỗi xóa: " + error.message);
    fetchDocs();
  };

  const openAddModal = () => {
      setIsEditing(false); 
      setEditId(null);
      setTitle(''); 
      setVideoUrl(''); 
      setShowModal(true);
  };

  const openEditModal = (doc: Document) => {
      setIsEditing(true); 
      setEditId(doc.id); 
      setTitle(doc.title); 
      setVideoUrl(doc.video_url); 
      setShowModal(true);
  };

  const filteredDocs = docs.filter(doc => doc.title.toLowerCase().includes(searchTerm.toLowerCase()));

  if (!isMounted) return null;

  return (
    <div className="p-4 md:p-6 h-full bg-[#fdfbf7] overflow-y-auto custom-scrollbar">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 md:mb-8 border-b border-red-900/10 pb-4 gap-4">
        <h2 className="text-2xl md:text-3xl font-serif font-bold text-red-900 uppercase text-center md:text-left w-full md:w-auto">
          Kho Tàng Tư Liệu
        </h2>
        
        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative group w-full md:w-64">
                <input 
                  type="text" 
                  placeholder="Tìm tên bài quyền..." 
                  className="text-red-900 placeholder:text-red-700/50 w-full pl-10 pr-4 py-2 rounded-full border border-stone-200 bg-white focus:border-red-800 outline-none text-sm transition-all shadow-sm" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
                <svg className="h-5 w-5 absolute left-3 top-2.5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            {isAdmin && (
              <button 
                onClick={openAddModal} 
                className="w-full md:w-auto bg-red-900 text-white px-5 py-2 rounded-xl shadow-md font-bold hover:bg-red-800 flex items-center justify-center gap-2 text-sm whitespace-nowrap"
              >
                <span className="text-xl">+</span> Đăng Video
              </button>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {filteredDocs.map((doc) => {
          const videoId = getYouTubeId(doc.video_url);
          return (
            <div key={doc.id} className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-stone-100 overflow-hidden flex flex-col group">
              <div className="relative w-full aspect-video bg-black group-hover:border-red-900/20 border-b border-stone-100">
                {videoId ? (
                  <iframe
                    className="absolute top-0 left-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
                    title={doc.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    style={{ border: 0 }}
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-stone-500 text-xs bg-stone-100">
                    Link video không hợp lệ
                  </div>
                )}
              </div>

              <div className="p-4 md:p-5 flex-1 flex flex-col justify-between">
                <h3 className="font-serif font-bold text-lg text-stone-800 group-hover:text-red-900 transition-colors mb-2 line-clamp-2">{doc.title}</h3>
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-stone-100">
                  <span className="text-xs text-stone-400 italic">{new Date(doc.created_at).toLocaleDateString('vi-VN')}</span>
                  {isAdmin && (
                      <div className="flex gap-2">
                          <button onClick={() => openEditModal(doc)} className="text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-2 rounded-full transition-colors" title="Sửa video">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button onClick={() => handleDelete(doc.id)} className="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 p-2 rounded-full transition-colors" title="Xóa video">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                      </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {filteredDocs.length === 0 && <div className="text-center text-stone-400 italic font-serif py-20 text-lg">Chưa có tư liệu nào.</div>}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#fdfbf7] rounded-3xl shadow-2xl w-full max-w-md p-6 md:p-8 border-4 border-double border-red-900/20 animate-in zoom-in duration-300">
            <h3 className="text-xl md:text-2xl font-serif font-bold mb-6 text-red-900 text-center uppercase">{isEditing ? 'Cập Nhật Video' : 'Đăng Tư Liệu Mới'}</h3>
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1 uppercase">Tiêu đề video</label>
                <input required className="text-red-900 placeholder:text-red-700/50 w-full border border-stone-200 p-3 rounded-xl focus:border-red-800 outline-none bg-white shadow-sm font-serif" value={title} onChange={e => setTitle(e.target.value)} placeholder="VD: Bài quyền nhập môn..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1 uppercase">Link Youtube / Video</label>
                <input required className="text-red-900 placeholder:text-red-700/50 w-full border border-stone-200 p-3 rounded-xl focus:border-red-800 outline-none bg-white shadow-sm font-sans" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://youtu.be/..." />
                <p className="text-[10px] text-gray-400 mt-1 italic">* Bấm "Chia sẻ" trên YouTube để lấy link ngắn</p>
              </div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="w-full sm:w-auto px-5 py-2 text-stone-500 hover:bg-stone-100 rounded-xl font-bold transition-colors">Hủy</button>
                <button type="submit" className="w-full sm:w-auto px-6 py-2 bg-red-900 text-white rounded-xl hover:bg-red-800 font-bold shadow-lg">
                    {isEditing ? 'Lưu Thay Đổi' : 'Đăng Ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

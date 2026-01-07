'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import dynamic from 'next/dynamic';

// 1. SỬA LỖI MODULE: Import từ 'react-player' gốc thay vì '/youtube'
// Ép kiểu 'any' để tránh lỗi TypeScript checking quá gắt
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false }) as any;

interface Document { id: string; title: string; video_url: string; created_at: string; }

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

  const ensureHttps = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://')) return url.replace('http://', 'https://');
    return url;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = ensureHttps(videoUrl.trim());
    
    if (!title.trim() || !cleanUrl) return alert("Thiếu thông tin!");

    try {
        if (isEditing && editId) {
            await supabase.from('documents').update({ title, video_url: cleanUrl }).eq('id', editId);
            alert('Đã cập nhật!');
        } else {
            await supabase.from('documents').insert([{ title, video_url: cleanUrl }]);
            alert('Đã đăng thành công!');
        }
        setShowModal(false); 
        fetchDocs();
        setTitle('');
        setVideoUrl('');
    } catch (error: any) { alert('Lỗi: ' + error.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa video này?')) return;
    await supabase.from('documents').delete().eq('id', id);
    fetchDocs();
  };

  const openAddModal = () => { setIsEditing(false); setTitle(''); setVideoUrl(''); setShowModal(true); };
  const openEditModal = (doc: Document) => { setIsEditing(true); setEditId(doc.id); setTitle(doc.title); setVideoUrl(doc.video_url); setShowModal(true); };

  const filteredDocs = docs.filter(doc => doc.title.toLowerCase().includes(searchTerm.toLowerCase()));

  if (!isMounted) return null;

  return (
    <div className="p-6 h-full bg-[#fdfbf7] overflow-y-auto custom-scrollbar">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-red-900/10 pb-4 gap-4">
        <h2 className="text-3xl font-serif font-bold text-red-900 uppercase">Kho Tàng Tư Liệu</h2>
        <div className="flex items-center gap-3 w-full md:w-auto">
            <input 
              type="text" 
              placeholder="Tìm kiếm..." 
              className="pl-4 pr-4 py-2 rounded-full border border-stone-200 text-sm w-64 outline-none focus:border-red-900" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
            {isAdmin && <button onClick={openAddModal} className="bg-red-900 text-white px-5 py-2 rounded-xl font-bold shadow hover:bg-red-800 text-sm cursor-pointer">+ Đăng Video</button>}
        </div>
      </div>

      {/* DANH SÁCH VIDEO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredDocs.map((doc) => (
          <div key={doc.id} className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
            
            {/* KHUNG VIDEO: Fix AbortError bằng cách bỏ autoplay và dùng controls native */}
            <div className="relative w-full aspect-video bg-black">
                <ReactPlayer 
                    url={doc.video_url}
                    width="100%" 
                    height="100%" 
                    controls={true} // Bắt buộc bật controls để người dùng tự bấm play
                    playing={false} // Tắt autoplay để tránh xung đột AbortError
                    config={{
                        youtube: {
                            playerVars: {
                                showinfo: 1,
                                modestbranding: 1,
                                rel: 0,
                                playsinline: 1, // Hỗ trợ tốt hơn trên mobile/webview
                                origin: typeof window !== 'undefined' ? window.location.origin : undefined
                            }
                        }
                    }}
                />
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-stone-800 line-clamp-2 text-sm md:text-base">{doc.title}</h3>
                <p className="text-xs text-stone-400 mt-1">{new Date(doc.created_at).toLocaleDateString('vi-VN')}</p>
              </div>
              
              {isAdmin && (
                <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-stone-100">
                    <button onClick={() => openEditModal(doc)} className="text-blue-600 text-xs font-bold px-3 py-1 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer">Sửa</button>
                    <button onClick={() => handleDelete(doc.id)} className="text-red-600 text-xs font-bold px-3 py-1 bg-red-50 rounded-lg hover:bg-red-100 cursor-pointer">Xóa</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredDocs.length === 0 && (
        <div className="text-center text-stone-400 italic mt-10">Chưa có video nào.</div>
      )}

      {/* MODAL FORM */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4 text-center text-red-900">{isEditing ? 'Sửa Video' : 'Đăng Video Mới'}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">Tiêu đề</label>
                <input className="w-full border border-stone-300 p-2 rounded-lg outline-none focus:border-red-900" value={title} onChange={e => setTitle(e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">Link YouTube</label>
                <input className="w-full border border-stone-300 p-2 rounded-lg outline-none focus:border-red-900" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} required placeholder="https://youtu.be/..." />
                <p className="text-[10px] text-stone-400 mt-1">* Nên dùng link chia sẻ ngắn (youtu.be)</p>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-stone-600 font-bold hover:bg-stone-100 rounded-lg cursor-pointer">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-red-900 text-white rounded-lg font-bold hover:bg-red-800 shadow cursor-pointer">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
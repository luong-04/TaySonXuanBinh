'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import dynamic from 'next/dynamic';

// FIX LỖI Ở ĐÂY:
// 1. Đổi import sang 'react-player' (gói chính) để TypeScript nhận diện đúng.
// 2. Dùng 'as any' để tắt kiểm tra type khắt khe khi dùng dynamic import.
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false }) as any;

interface Document {
  id: string;
  title: string;
  video_url: string;
  created_at: string;
}

export default function DocumentManager({ userRole }: { userRole: string }) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  // Form thêm mới
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  const isAdmin = userRole === 'admin' || userRole === 'master_head';

  useEffect(() => {
    setIsClient(true);
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setDocs(data);
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    // Chấp nhận link youtube.com và youtu.be
    if (!videoUrl.includes('youtube.com') && !videoUrl.includes('youtu.be')) {
      alert('Vui lòng chỉ nhập link Youtube!');
      return;
    }

    const { error } = await supabase.from('documents').insert([{
      title,
      video_url: videoUrl
    }]);

    if (error) {
      alert('Lỗi: ' + error.message);
    } else {
      alert('Đã đăng video thành công!');
      setShowModal(false);
      setTitle('');
      setVideoUrl('');
      fetchDocs();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa video này không?')) return;
    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (!error) fetchDocs();
    else alert('Không thể xóa: ' + error.message);
  };

  if (!isClient) return null;

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-red-900 uppercase">Kho Tài Liệu Video</h2>
        {isAdmin && (
          <button 
            onClick={() => setShowModal(true)}
            className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded shadow font-bold flex gap-2"
          >
            + Đăng Video Mới
          </button>
        )}
      </div>

      {/* Grid Video */}
      {loading ? <p>Đang tải tài liệu...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {docs.length === 0 && <p className="text-gray-500 col-span-3 text-center">Chưa có video nào.</p>}
          
          {docs.map((doc) => (
            <div key={doc.id} className="bg-white rounded-lg shadow-md overflow-hidden border hover:shadow-lg transition-shadow">
              {/* Video Player Container */}
              <div className="aspect-video relative bg-black">
                <ReactPlayer 
                  url={doc.video_url} 
                  width="100%" 
                  height="100%" 
                  controls={true}
                  // config để ẩn các gợi ý video liên quan khi pause
                  config={{
                    youtube: {
                      playerVars: { showinfo: 1 }
                    }
                  }}
                />
              </div>

              {/* Thông tin */}
              <div className="p-4">
                <h3 className="font-bold text-lg text-gray-800 line-clamp-2 min-h-14">
                  {doc.title}
                </h3>
                
                {isAdmin && (
                  <div className="mt-3 flex justify-end border-t pt-2">
                    <button 
                      onClick={() => handleDelete(doc.id)}
                      className="text-red-600 text-sm hover:underline flex items-center gap-1"
                    >
                      🗑 Xóa video
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Thêm Video */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 animate-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-4 text-red-900">Đăng Video Mới</h3>
            <form onSubmit={handleAdd}>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-1">Tiêu đề video</label>
                <input required className="w-full border p-2 rounded" 
                  value={title} onChange={e => setTitle(e.target.value)} 
                  placeholder="VD: Bài quyền nhập môn..." />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-bold mb-1">Link Youtube</label>
                <input required className="w-full border p-2 rounded" 
                  value={videoUrl} onChange={e => setVideoUrl(e.target.value)} 
                  placeholder="https://www.youtube.com/watch?v=..." />
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Hủy</button>
                <button type="submit" className="px-6 py-2 bg-red-800 text-white font-bold rounded">Đăng</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
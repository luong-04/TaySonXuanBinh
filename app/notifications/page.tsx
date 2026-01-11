'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase'; // Đã sửa đường dẫn import cho đúng
import Link from 'next/link';
import { Bell, ArrowLeft, Calendar } from 'lucide-react';

interface Notification {
  id: string;
  content: string;
  created_at: string;
  is_active: boolean;
}

export default function NotificationsPage() {
  const [notis, setNotis] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotis = async () => {
      setLoading(true);
      // Lấy tất cả thông báo, sắp xếp tin mới nhất lên đầu
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (data) setNotis(data as Notification[]);
      setLoading(false);
    };

    fetchNotis();
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 font-sans">
      {/* HEADER CỦA TRANG THÔNG BÁO */}
      <div className="bg-red-900 text-yellow-400 p-4 shadow-md sticky top-0 z-50 flex items-center gap-4 border-b-4 border-yellow-600">
        <Link href="/" className="p-2 hover:bg-red-800 rounded-full transition-colors text-white">
            <ArrowLeft size={24} />
        </Link>
        <h1 className="text-lg md:text-xl font-bold font-serif uppercase tracking-wider flex items-center gap-2">
            <Bell className="fill-yellow-400 text-yellow-400" size={20}/>
            Bảng Tin Thông Báo
        </h1>
      </div>

      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6 pb-20">
        {loading ? (
            <div className="text-center text-stone-400 italic py-10 animate-pulse">Đang tải tin tức...</div>
        ) : notis.length === 0 ? (
            <div className="text-center text-stone-500 py-10 flex flex-col items-center gap-3">
                <Bell size={48} className="text-stone-300" />
                <p>Hiện chưa có thông báo nào.</p>
            </div>
        ) : (
            notis.map((item, index) => {
                // Kiểm tra xem tin có mới trong vòng 3 ngày không
                const isNew = (new Date().getTime() - new Date(item.created_at).getTime()) < (3 * 24 * 60 * 60 * 1000);
                
                return (
                    <div 
                        key={item.id} 
                        className={`bg-white p-5 rounded-xl border-l-4 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 
                        ${isNew ? 'border-red-600 ring-1 ring-red-100' : 'border-stone-300 opacity-90'}`} 
                        style={{animationDelay: `${index * 50}ms`}}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                {isNew && (
                                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-800 animate-pulse">
                                        Mới nhất
                                    </span>
                                )}
                                <span className="text-xs text-stone-400 flex items-center gap-1 bg-stone-100 px-2 py-0.5 rounded-md">
                                    <Calendar size={12}/>
                                    {new Date(item.created_at).toLocaleString('vi-VN')}
                                </span>
                            </div>
                        </div>
                        <div className="prose prose-stone max-w-none">
                            <p className="text-stone-800 text-base md:text-lg leading-relaxed whitespace-pre-wrap font-medium">
                                {item.content}
                            </p>
                        </div>
                    </div>
                )
            })
        )}
        
        {!loading && notis.length > 0 && (
            <div className="text-center pt-8">
                <p className="text-xs text-stone-400 uppercase tracking-widest">--- Hết danh sách ---</p>
            </div>
        )}
      </div>
    </div>
  );
}
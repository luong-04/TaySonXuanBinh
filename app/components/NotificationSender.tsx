'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Bell, Send, Trash2, Edit2, Save, AlertCircle } from 'lucide-react';

interface Notification {
  id: string;
  content: string;
  created_at: string;
}

export default function NotificationSender() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [notis, setNotis] = useState<Notification[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchNotis = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setNotis(data as Notification[]);
  };

  useEffect(() => {
    fetchNotis();
    // Vẫn giữ Realtime để đồng bộ nếu có Admin khác cùng thao tác
    const channel = supabase
      .channel('admin-noti-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchNotis();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // --- HÀM PHÁT TÍN HIỆU CHO HEADER ---
  const triggerHeaderUpdate = () => {
      // Tạo sự kiện nội bộ để cái chuông biết mà cập nhật ngay
      if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('noti-changed'));
      }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);
    
    try {
        if (editingId) {
            // --- SỬA ---
            const { error } = await supabase
                .from('notifications')
                .update({ content: message })
                .eq('id', editingId);

            if (error) throw error;
            
            // Cập nhật UI ngay lập tức (không chờ server)
            setNotis(notis.map(n => n.id === editingId ? { ...n, content: message } : n));
            setEditingId(null);
            setMessage('');
            alert('Đã cập nhật xong!');
        } else {
            // 1. Lưu vào Database (Giữ nguyên code cũ)
            const { data, error } = await supabase
                .from('notifications')
                .insert([{ content: message, is_active: true }])
                .select()
                .single();

            if (error) throw error;
            
            // 2. [THÊM MỚI] BẮN PUSH NOTIFICATION (NHƯ ZALO)
            // Gửi lệnh lên Server để bắn tin đi
            await fetch('/api/send-push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    heading: "📢 Thông báo mới từ Môn Phái"
                })
            });
            
            // Cập nhật UI ngay lập tức
            if (data) setNotis([data as Notification, ...notis]);
            setMessage('');
            alert('Đã phát thông báo thành công! Tin nhắn sẽ được đẩy đến điện thoại mọi người.');
        }
        // Gọi cái chuông cập nhật ngay
        triggerHeaderUpdate();

    } catch (error: any) {
        alert('Lỗi: ' + error.message);
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
      if (!confirm('Bạn có chắc muốn xóa vĩnh viễn?')) return;
      
      // Xóa UI ngay lập tức cho mượt
      setNotis(notis.filter(n => n.id !== id));

      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) {
          alert('Lỗi xóa: ' + error.message);
          fetchNotis(); // Nếu lỗi thì tải lại danh sách cũ
      } else {
          // Gọi cái chuông cập nhật ngay
          triggerHeaderUpdate();
      }
  };

  const handleEdit = (item: Notification) => {
      setMessage(item.content);
      setEditingId(item.id);
      const formElement = document.getElementById('noti-form');
      if(formElement) formElement.scrollIntoView({ behavior: 'smooth' });
  };

  const cancelEdit = () => {
      setEditingId(null);
      setMessage('');
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
        {/* --- FORM GỬI / SỬA --- */}
        <div id="noti-form" className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
            <h3 className="font-bold text-red-900 mb-4 flex items-center gap-2 font-serif text-lg">
                <Bell className="text-red-900" /> 
                {editingId ? 'Chỉnh Sửa Thông Báo' : 'Phát Thông Báo Mới'}
            </h3>
            
            <div className={`p-4 rounded-xl border mb-4 text-sm flex gap-2 items-start ${editingId ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                {editingId ? (
                    <p>Bạn đang sửa thông báo. Nội dung sẽ được cập nhật lại trong lịch sử.</p>
                ) : (
                    <p>Tin nhắn sẽ hiện số đỏ trên ứng dụng của tất cả mọi người ngay lập tức.</p>
                )}
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-3">
                <textarea 
                    rows={3}
                    placeholder="Nhập nội dung thông báo quan trọng..." 
                    className="w-full border border-stone-300 rounded-xl px-4 py-3 focus:border-red-800 outline-none shadow-sm transition-all resize-none font-medium text-stone-800"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                />
                <div className="flex gap-3 justify-end">
                    {editingId && (
                        <button type="button" onClick={cancelEdit} className="px-6 py-2 rounded-xl font-bold hover:bg-stone-100 text-stone-500 transition-all">Hủy</button>
                    )}
                    <button 
                        disabled={loading}
                        className={`text-white px-8 py-2 rounded-xl font-bold shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 
                        ${editingId ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-red-900 hover:bg-red-800'}`}
                    >
                        {loading ? 'Đang xử lý...' : editingId ? <><Save size={18} /> Lưu Lại</> : <><Send size={18} /> Gửi Ngay</>}
                    </button>
                </div>
            </form>
        </div>

        {/* --- DANH SÁCH LỊCH SỬ --- */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
            <h3 className="font-bold text-stone-800 mb-4 flex items-center gap-2 font-serif text-lg border-b border-stone-100 pb-2">
                📂 Quản Lý Lịch Sử Đã Gửi
            </h3>
            <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                {notis.length === 0 ? (
                    <div className="text-center text-stone-400 italic py-8">Chưa có thông báo nào được gửi.</div>
                ) : (
                    notis.map((item) => (
                        <div key={item.id} className={`group p-4 rounded-xl border transition-all hover:shadow-md flex flex-col sm:flex-row justify-between items-start gap-4 ${editingId === item.id ? 'bg-yellow-50 border-yellow-300 ring-1 ring-yellow-300' : 'bg-stone-50 border-stone-200'}`}>
                            <div className="flex-1 w-full">
                                <p className="text-stone-800 whitespace-pre-wrap font-medium text-sm md:text-base leading-relaxed">{item.content}</p>
                                <p className="text-[10px] sm:text-xs text-stone-400 mt-2 font-mono flex items-center gap-1">🕒 {new Date(item.created_at).toLocaleString('vi-VN')}</p>
                            </div>
                            <div className="flex gap-2 shrink-0 self-end sm:self-start opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(item)} className="p-2 bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors shadow-sm"><Edit2 size={16} /></button>
                                <button onClick={() => handleDelete(item.id)} className="p-2 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors shadow-sm"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    </div>
  );
}
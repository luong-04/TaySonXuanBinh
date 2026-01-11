'use client';
import { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import { supabase } from './lib/supabase';
// Import các Icon
import { Network, Users, Shield, BookOpen } from 'lucide-react';

import GiaPhaTree from './components/GiaPhaTree';
import CoachManager from './components/CoachManager';
import ClubManager from './components/ClubManager';
import DocumentManager from './components/DocumentManager';
import NotificationSender from './components/NotificationSender';

// --- COMPONENT NÚT TAB (GIỮ NGUYÊN) ---
const TabButton = ({ id, label, icon: Icon, show = true, isActive, onClick }: any) => {
    if (!show) return null;
    return (
      <button
          id={`tab-btn-${id}`}
          type="button"
          onClick={(e) => {
              e.preventDefault();
              onClick(id);
          }}
          className={`flex items-center gap-2 px-4 py-3 font-bold uppercase transition-all whitespace-nowrap text-xs md:text-sm lg:text-base border-b-4 shrink-0 focus:outline-none select-none snap-center
          ${isActive 
              ? 'text-red-900 border-red-900 bg-red-50' 
              : 'text-stone-500 border-transparent hover:bg-stone-50 hover:text-red-800'
          }`}
      >
          <Icon size={18} className={isActive ? "text-red-900" : "text-stone-400"} />
          <span>{label}</span>
      </button>
    );
};

export default function Home() {
  const [activeTab, setActiveTab] = useState('giapha');
  const [userRole, setUserRole] = useState('guest');
  
  // Ref để điều khiển thanh cuộn tab
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('auth_id', session.user.id)
          .single();
        
        if (profile) {
            const p = profile as { role: string };
            setUserRole(p.role);
        }
      }
    };
    checkUser();
  }, []);

  // --- HIỆU ỨNG CUỘN TAB (GIỮ NGUYÊN) ---
  useEffect(() => {
      const activeBtn = document.getElementById(`tab-btn-${activeTab}`);
      if (activeBtn && tabsContainerRef.current) {
          activeBtn.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'nearest', 
              inline: 'center'
          });
      }
  }, [activeTab]);

  const isAdmin = userRole === 'admin' || userRole === 'master_head';

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-stone-100 font-sans">
      
      {/* 1. THANH TRANG TRÍ TRÁI */}
      <div className="hidden md:flex w-16 bg-red-900 text-yellow-100 items-center justify-center border-r-2 border-yellow-600 shadow-xl z-50 shrink-0">
          <h2 className="font-serif font-bold text-2xl [writing-mode:vertical-rl] rotate-180 whitespace-nowrap py-10 opacity-90 select-none">
              VÕ CỔ TRUYỀN
          </h2>
      </div>

      {/* 2. KHÔNG GIAN LÀM VIỆC CHÍNH */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Header luôn hiển thị ở trên cùng */}
        <Header />
        
        {/* THANH TAB MENU */}
        <div 
            ref={tabsContainerRef}
            className="bg-white shadow-sm z-40 flex overflow-x-auto border-b shrink-0 scrollbar-hide touch-pan-x snap-x"
        >
             <TabButton 
                id="giapha" label="Gia Phả" icon={Network} 
                isActive={activeTab === 'giapha'} onClick={setActiveTab} 
             />
             <TabButton 
                id="hlv" label="Quản Lý HLV" icon={Users} 
                isActive={activeTab === 'hlv'} onClick={setActiveTab} 
             />
             <TabButton 
                id="clb" label="Quản Lý CLB" icon={Shield} 
                isActive={activeTab === 'clb'} onClick={setActiveTab} 
             />
             <TabButton 
                id="tailieu" label="Tài Liệu" icon={BookOpen} 
                isActive={activeTab === 'tailieu'} onClick={setActiveTab} 
             /> 
        </div>

        {/* NỘI DUNG CHÍNH (MAIN) */}
        <main className="flex-1 overflow-hidden relative bg-stone-50">
            {/* LOGIC QUAN TRỌNG:
               - Nếu là 'giapha': Class là 'h-full w-full overflow-hidden' -> Để GiaPhaTree tự chia cột và cuộn bên trong.
               - Nếu là tab khác: Class có 'overflow-y-auto p-6' -> Để nội dung văn bản cuộn bình thường.
            */}
            <div className={`h-full w-full ${activeTab === 'giapha' ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar p-2 md:p-6 pb-20 md:pb-6'}`}>
                
                {activeTab === 'giapha' && <GiaPhaTree />}
                
                {activeTab === 'hlv' && (
                    <div className="container mx-auto animate-in fade-in duration-300">
                        <CoachManager userRole={userRole} />
                    </div>
                )}
                
                {activeTab === 'clb' && (
                    <div className="container mx-auto animate-in fade-in duration-300">
                        <ClubManager userRole={userRole} />
                    </div>
                )}
                
                {activeTab === 'tailieu' && (
                    <div className="container mx-auto animate-in fade-in duration-300">
                        <DocumentManager userRole={userRole} />
                    </div>
                )}

                {activeTab === 'thongbao' && isAdmin && (
                    <div className="container mx-auto max-w-4xl animate-in fade-in duration-300 pt-4 md:pt-8">
                         <NotificationSender />
                    </div>
                )}
            </div>
        </main>
      </div>

      {/* 3. THANH TRANG TRÍ PHẢI */}
      <div className="hidden md:flex w-16 bg-red-900 text-yellow-100 items-center justify-center border-l-2 border-yellow-600 shadow-xl z-50 shrink-0">
          <h2 className="font-serif font-bold text-2xl [writing-mode:vertical-rl] whitespace-nowrap py-10 opacity-90 select-none">
              TÂY SƠN XUÂN BÌNH
          </h2>
      </div>

    </div>
  );
}
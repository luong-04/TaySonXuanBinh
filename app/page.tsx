'use client';
import { useState, useEffect } from 'react';
import Header from './components/Header';
import { supabase } from './lib/supabase';

import GiaPhaTree from './components/GiaPhaTree';
import CoachManager from './components/CoachManager';
import ClubManager from './components/ClubManager';
import DocumentManager from './components/DocumentManager';

export default function Home() {
  const [activeTab, setActiveTab] = useState('giapha');
  const [userRole, setUserRole] = useState('guest');

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

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-stone-100 font-sans">
      
      {/* 1. THANH TRANG TRÍ TRÁI */}
      {/* Đã tăng từ w-12 lên w-16 để chữ không bị đụng viền */}
      <div className="hidden md:flex w-16 bg-red-900 text-yellow-100 items-center justify-center border-r-2 border-yellow-600 shadow-xl z-50 shrink-0">
          <h2 className="font-serif font-bold text-2xl [writing-mode:vertical-rl] rotate-180 whitespace-nowrap py-10 opacity-90 select-none">
              VÕ CỔ TRUYỀN
          </h2>
      </div>

      {/* 2. KHÔNG GIAN LÀM VIỆC CHÍNH */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <Header />
        
        <div className="bg-white shadow z-40 flex overflow-x-auto border-b shrink-0">
          {['giapha', 'hlv', 'clb', 'tailieu'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-bold uppercase transition-colors whitespace-nowrap text-sm md:text-base ${
                activeTab === tab 
                  ? 'text-red-900 border-b-4 border-red-900 bg-red-50' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-red-800'
              }`}
            >
              {tab === 'giapha' && 'Gia Phả'}
              {tab === 'hlv' && 'Quản Lý HLV'}
              {tab === 'clb' && 'Quản Lý CLB'}
              {tab === 'tailieu' && 'Tài Liệu'}
            </button>
          ))}
        </div>

        <main className="flex-1 overflow-hidden relative bg-stone-50">
          <div className="h-full w-full overflow-y-auto custom-scrollbar p-2 md:p-4">
            {activeTab === 'giapha' && <div className="h-full"><GiaPhaTree /></div>}
            {activeTab === 'hlv' && <div className="container mx-auto"><CoachManager userRole={userRole} /></div>}
            {activeTab === 'clb' && <ClubManager userRole={userRole} />}
            {activeTab === 'tailieu' && <div className="container mx-auto"><DocumentManager userRole={userRole} /></div>}
          </div>
        </main>
      </div>

      {/* 3. THANH TRANG TRÍ PHẢI */}
      {/* Đã tăng từ w-12 lên w-16 */}
      <div className="hidden md:flex w-16 bg-red-900 text-yellow-100 items-center justify-center border-l-2 border-yellow-600 shadow-xl z-50 shrink-0">
          <h2 className="font-serif font-bold text-2xl [writing-mode:vertical-rl] whitespace-nowrap py-10 opacity-90 select-none">
              TÂY SƠN XUÂN BÌNH
          </h2>
      </div>

    </div>
  );
}
'use client';
import { useState, useEffect } from 'react';
import Header from './components/Header'; // Đã sửa đường dẫn
import { supabase } from './lib/supabase'; // Dùng file kết nối chung
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
    <div className="min-h-screen bg-gray-50 font-sans pb-10">
      <Header />
      
      {/* Menu Tabs */}
      <div className="bg-white shadow sticky top-24 z-40 flex overflow-x-auto border-b">
        {['giapha', 'hlv', 'clb', 'tailieu'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 md:px-6 md:py-4 font-bold uppercase transition-colors whitespace-nowrap text-sm md:text-base ${
              activeTab === tab 
                ? 'text-red-800 border-b-4 border-red-800 bg-red-50' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab === 'giapha' && 'Gia Phả'}
            {tab === 'hlv' && 'Quản Lý HLV'}
            {tab === 'clb' && 'Quản Lý CLB'}
            {tab === 'tailieu' && 'Tài Liệu'}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <main className="p-4 container mx-auto bg-white mt-4 rounded shadow min-h-[500px]">
        {activeTab === 'giapha' && (
          <div>
            <h2 className="text-2xl font-bold text-red-900 mb-4 text-center">Cây Gia Phả Môn Phái</h2>
            {/* Gọi Component Cây Gia Phả vào đây */}
            <GiaPhaTree />
          </div>
        )}
        
        {activeTab === 'hlv' && (
          // Truyền userRole vào để component biết có hiện nút Thêm hay không
          <CoachManager userRole={userRole} />
        )}
        
        {activeTab === 'clb' && (
          <ClubManager userRole={userRole} />
        )}
        
        {activeTab === 'tailieu' && (
          <DocumentManager userRole={userRole} />
        )}
      </main>
    </div>
  );
}
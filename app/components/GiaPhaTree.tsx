'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Person {
  id: string; full_name: string; avatar_url: string | null; belt_level: number;
  national_rank: string | null; title: string | null; role: string; join_date: string; master_id: string | null;
}

interface YearGroup { year: number; members: Person[]; }

// --- CARD THÀNH VIÊN (Đã khôi phục Badge Đẳng Quốc Gia) ---
const MemberCard = ({ node }: { node: Person }) => {
  const isGrandMaster = node.role === 'grandmaster';
  const isMasterHead = node.role === 'master_head';

  return (
    <div className={`relative flex flex-col items-center p-3 rounded-xl transition-all duration-500 w-44 shrink-0 group z-10
        ${isGrandMaster ? 'bg-gradient-to-b from-yellow-100 to-yellow-200 border-2 border-yellow-500 shadow-xl shadow-yellow-900/40 scale-110' : 
          isMasterHead ? 'bg-white border-2 border-red-200 shadow-lg shadow-red-900/30 scale-105' : 
          'bg-white/95 border border-stone-200 shadow-md hover:shadow-xl hover:scale-105'}
    `}>
        {/* Avatar */}
        <div className="relative">
            <div className={`w-16 h-16 rounded-full overflow-hidden border-2 shadow-sm
                ${isGrandMaster ? 'border-yellow-600' : 'border-stone-200 group-hover:border-red-300'} bg-stone-100`}>
                <img src={node.avatar_url || "https://via.placeholder.com/150?text=IMG"} alt={node.full_name} className="w-full h-full object-cover"/>
            </div>
            
            {/* --- BADGE ĐẲNG QUỐC GIA (KHÔI PHỤC) --- */}
            {node.national_rank && (
                 <div className="absolute -top-1 -right-2 bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded-full border border-white shadow-md z-20 font-bold uppercase tracking-tighter flex items-center gap-0.5">
                    <span className="text-yellow-300">★</span> {node.national_rank}
                 </div>
            )}
        </div>

        {/* Thông tin */}
        <div className="mt-2 text-center w-full">
            {(isGrandMaster || isMasterHead) && (
                <div className={`text-[9px] font-black uppercase mb-0.5 ${isGrandMaster ? 'text-red-800' : 'text-red-700'}`}>
                    {isGrandMaster ? 'SƯ TỔ' : 'TRƯỞNG TRÀNG'}
                </div>
            )}

            <h3 className="text-sm font-serif font-bold text-red-900 uppercase leading-tight px-1 drop-shadow-sm line-clamp-2 min-h-[1.25rem]">
                {node.full_name}
            </h3>
            
            <div className="mt-1.5 flex flex-col items-center gap-1">
                {/* Cấp đai + Danh hiệu */}
                <div className="flex items-center justify-center bg-stone-100 rounded px-1.5 py-0.5 border border-stone-200">
                    <span className="text-[9px] font-bold text-stone-600">Đai {node.belt_level}</span>
                    {node.title && (
                        <span className="text-[9px] font-bold text-red-800 border-l border-stone-300 pl-1 ml-1 uppercase">
                            {node.title}
                        </span>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default function GiaPhaTimeline() {
  const [grandMasters, setGrandMasters] = useState<Person[]>([]);
  const [masterHeads, setMasterHeads] = useState<Person[]>([]);
  const [timelineData, setTimelineData] = useState<YearGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeYear, setActiveYear] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*');
    if (data) {
        const profiles = data as Person[];
        setGrandMasters(profiles.filter(p => p.role === 'grandmaster'));
        setMasterHeads(profiles.filter(p => p.role === 'master_head'));
        
        const others = profiles.filter(p => p.role !== 'grandmaster' && p.role !== 'master_head');
        const groups: Record<number, Person[]> = {};
        others.forEach(p => {
            const year = new Date(p.join_date || '2024-01-01').getFullYear();
            if (!groups[year]) groups[year] = [];
            groups[year].push(p);
        });
        
        setTimelineData(Object.keys(groups).map(y => ({ year: parseInt(y), members: groups[parseInt(y)] })).sort((a, b) => a.year - b.year));
        if(Object.keys(groups).length > 0) setActiveYear(parseInt(Object.keys(groups)[0]));
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const scrollToYear = (year: number) => {
      document.getElementById(`year-${year}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveYear(year);
  };

  if (loading) return <div className="h-full flex items-center justify-center font-serif text-red-900/50 italic animate-pulse">⏳ Đang tra cứu niên sử...</div>;

  return (
    // CONTAINER TỔNG: NỀN ĐỎ (#da251d)
    <div className="flex h-full w-full bg-[#da251d] overflow-hidden rounded-xl shadow-inner border-2 border-yellow-600/30">
        
        {/* --- CỘT TRÁI: SIDEBAR MỤC LỤC --- */}
        <div className="w-16 md:w-20 bg-white/90 backdrop-blur border-r border-red-200 flex flex-col py-4 z-30 shrink-0 shadow-xl">
            <div className="text-[10px] font-bold text-center text-red-800 uppercase mb-4 font-serif opacity-80">Niên Đại</div>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 px-2">
                {timelineData.map((group) => (
                    <button
                        key={group.year}
                        onClick={() => scrollToYear(group.year)}
                        className={`w-full text-center py-2 rounded-lg text-[10px] font-bold transition-all duration-300
                            ${activeYear === group.year ? 'bg-red-800 text-yellow-100 shadow-md scale-105' : 'text-stone-600 hover:bg-stone-200'}
                        `}
                    >
                        {group.year}
                    </button>
                ))}
            </div>
        </div>

        {/* --- CỘT PHẢI: KHUNG CHỨA NỘI DUNG CHÍNH --- */}
        <div className="flex-1 relative h-full">
            
            {/* 1. LỚP NỀN (CỐ ĐỊNH) - CÓ THÊM overflow-y-scroll ĐỂ CĂN CHỈNH */}
            {/* overflow-y-scroll ở đây là trick để tạo khoảng trống thanh cuộn ảo, giúp tâm ngôi sao trùng với tâm nội dung */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden overflow-y-scroll scrollbar-hide">
                <div className="relative w-full h-full flex items-center justify-center">
                    {/* NGÔI SAO VÀNG */}
                    <svg viewBox="0 0 24 24" className="w-[70vmin] h-[70vmin] text-[#ffff00] drop-shadow-2xl opacity-100 fill-current">
                        <path d="M12 1.73l2.42 7.46h7.84l-6.34 4.6 2.42 7.46-6.34-4.6-6.34 4.6 2.42-7.46-6.34-4.6h7.84z" />
                    </svg>
                    
                    {/* CHỮ CHÌM */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center mt-32 md:mt-48">
                        <h1 className="text-[6vw] font-serif font-black text-[#ffff00] opacity-30 whitespace-nowrap select-none">
                            GIA PHẢ MÔN PHÁI
                        </h1>
                    </div>
                </div>
            </div>

            {/* 2. LỚP NỘI DUNG (CUỘN ĐƯỢC) */}
            <div className="absolute inset-0 overflow-y-auto scroll-smooth p-8 z-10 custom-scrollbar" id="timeline-container">
                <div className="relative flex flex-col items-center space-y-12 pb-32 w-full">
                    
                    {/* TRỤC DỌC ẢO ĐỂ CĂN GIỮA (Giúp debug xem thẳng hàng chưa) */}
                    {/* <div className="absolute top-0 bottom-0 left-1/2 w-px bg-blue-500 -translate-x-1/2 z-50 opacity-50"></div> */}

                    {/* SƯ TỔ */}
                    {grandMasters.length > 0 && (
                        <div className="flex flex-col items-center animate-in fade-in zoom-in duration-700 relative z-10">
                            <div className="flex gap-8 justify-center flex-wrap">{grandMasters.map(p => <MemberCard key={p.id} node={p} />)}</div>
                            {/* Đường nối Vàng */}
                            <div className="h-10 w-1 bg-[#ffff00] mt-4 shadow-[0_0_10px_rgba(255,255,0,0.8)]"></div>
                        </div>
                    )}

                    {/* TRƯỞNG TRÀNG */}
                    {masterHeads.length > 0 && (
                        <div className="flex flex-col items-center animate-in slide-in-from-bottom duration-700 delay-100 relative z-10">
                            <div className="flex gap-8 justify-center flex-wrap">{masterHeads.map(p => <MemberCard key={p.id} node={p} />)}</div>
                            {/* Đường nối Vàng */}
                            <div className="h-12 w-0.5 border-l-2 border-dashed border-[#ffff00] mt-4 opacity-80"></div>
                        </div>
                    )}

                    {/* DANH SÁCH THEO NĂM */}
                    <div className="w-full max-w-6xl space-y-16 relative z-10">
                        {timelineData.map((group) => (
                            <div key={group.year} id={`year-${group.year}`} className="relative flex flex-col items-center group">
                                
                                {/* Thanh ngăn cách năm (Màu vàng rực rỡ) */}
                                <div className="flex items-center gap-4 w-full mb-8">
                                    <div className="h-0.5 bg-[#ffff00]/60 flex-1 rounded-full shadow-[0_0_5px_rgba(255,255,0,0.5)]"></div>
                                    <div className="px-6 py-1.5 bg-[#ffff00] text-red-900 rounded-full font-serif font-bold text-sm shadow-xl border-2 border-red-900 z-10 uppercase tracking-widest min-w-[100px] text-center">
                                        Năm {group.year}
                                    </div>
                                    <div className="h-0.5 bg-[#ffff00]/60 flex-1 rounded-full shadow-[0_0_5px_rgba(255,255,0,0.5)]"></div>
                                </div>
                                
                                <div className="flex flex-wrap justify-center gap-x-6 gap-y-8">
                                    {group.members.map((person) => <MemberCard key={person.id} node={person} />)}
                                </div>
                            </div>
                        ))}
                        {timelineData.length === 0 && grandMasters.length === 0 && <div className="text-center text-yellow-200/70 italic font-serif text-xl">Chưa có dữ liệu niên sử.</div>}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}
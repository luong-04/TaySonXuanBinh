'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Person {
  id: string; full_name: string; avatar_url: string | null; belt_level: number;
  national_rank: string | null; title: string | null; role: string; join_date: string; master_id: string | null;
}

interface YearGroup { year: number; members: Person[]; }

// --- CARD THÀNH VIÊN ---
const MemberCard = ({ node }: { node: Person }) => {
  const isGrandMaster = node.role === 'grandmaster';
  const isMasterHead = node.role === 'master_head';

  let cardStyle = "";
  let avatarBorder = "";
  let nameColor = "";
  let titleBg = "";
  let titleText = "";
  let rankBadge = "";

  if (isGrandMaster) {
    // SƯ TỔ: Thẻ Vàng Kim (Tailwind v4: bg-linear-to...)
    cardStyle = "bg-linear-to-br from-yellow-300 via-yellow-400 to-yellow-500 border-4 border-red-600 shadow-[0_0_30px_rgba(255,215,0,0.6)] scale-110 z-30";
    avatarBorder = "border-red-700 ring-2 ring-yellow-200";
    nameColor = "text-red-900 drop-shadow-sm font-black";
    titleBg = "bg-red-900 border-red-950 text-yellow-300";
    titleText = "text-yellow-300";
    rankBadge = "bg-red-700 text-yellow-100 border-yellow-200 shadow-md";
  } else if (isMasterHead) {
    // TRƯỞNG TRÀNG: Thẻ Đỏ Huyết Dụ
    cardStyle = "bg-linear-to-br from-red-800 via-red-900 to-[#4a0404] border-2 border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.5)] scale-105 z-20";
    avatarBorder = "border-yellow-400";
    nameColor = "text-yellow-400 font-bold";
    titleBg = "bg-yellow-900/50 border-yellow-500/50 text-yellow-200";
    titleText = "text-yellow-200";
    rankBadge = "bg-yellow-500 text-red-900 border-white shadow-md";
  } else {
    // THÀNH VIÊN: Thẻ Đỏ Nâu
    cardStyle = "bg-linear-to-b from-[#8B0000] to-[#5c0000] border-2 border-[#b22222] shadow-lg hover:shadow-yellow-500/30 hover:scale-105 hover:border-yellow-500 transition-all z-10";
    avatarBorder = "border-[#a52a2a] group-hover:border-yellow-500";
    nameColor = "text-white group-hover:text-yellow-200";
    titleBg = "bg-black/30 border-white/10 text-stone-300";
    titleText = "text-stone-300 group-hover:text-white";
    rankBadge = "bg-stone-700 text-white border-stone-500";
  }

  return (
    // RESPONSIVE: Mobile w-36, PC w-48
    <div className={`relative flex flex-col items-center p-3 rounded-xl transition-all duration-300 w-36 md:w-48 shrink-0 group ${cardStyle}`}>
        {/* Họa tiết chìm */}
        <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden rounded-xl">
             <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full border-4 border-white/10"></div>
             <div className="absolute top-8 -left-8 w-20 h-20 rounded-full border-2 border-white/5"></div>
        </div>

        {/* Avatar */}
        <div className="relative z-10">
            {/* RESPONSIVE: Mobile w-16 h-16, PC w-20 h-20 */}
            <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-4 shadow-inner ${avatarBorder} bg-stone-300`}>
                <img src={node.avatar_url || "https://via.placeholder.com/150?text=IMG"} alt={node.full_name} className="w-full h-full object-cover"/>
            </div>
            {node.national_rank && (
                 <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase whitespace-nowrap z-20 shadow-lg ${rankBadge}`}>
                    ★ {node.national_rank}
                 </div>
            )}
        </div>

        {/* Thông tin */}
        <div className="mt-4 text-center w-full z-10 space-y-1">
            {(isGrandMaster || isMasterHead) && (
                <div className={`text-[9px] md:text-[10px] font-black uppercase mb-1 tracking-widest ${isGrandMaster ? 'text-red-800' : 'text-yellow-500'}`}>
                    {isGrandMaster ? 'SƯ TỔ' : 'TRƯỞNG TRÀNG'}
                </div>
            )}
            <h3 className={`text-sm md:text-base font-serif leading-tight px-1 drop-shadow-md line-clamp-2 min-h-6 ${nameColor}`}>
                {node.full_name ? node.full_name.normalize('NFC') : ''}
            </h3>
            <div className={`inline-flex items-center justify-center rounded-lg px-2 md:px-3 py-1 border mt-1 ${titleBg} backdrop-blur-md`}>
                <span className="text-[10px] md:text-[11px] font-bold">Đai {node.belt_level}</span>
                {node.title && (
                    <span className={`text-[10px] md:text-[11px] font-bold border-l pl-2 ml-2 ${isGrandMaster ? 'border-red-800' : 'border-white/20'} ${titleText}`}>
                        {node.title.normalize('NFC')}
                    </span>
                )}
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
    const { data } = await supabase.from('profiles').select('*').neq('role', 'student'); 
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
    // CONTAINER TỔNG: 
    // SỬA: flex-col (Mobile: Trên dưới) -> md:flex-row (PC: Trái phải)
    <div className="flex flex-col md:flex-row h-full w-full bg-[#da251d] overflow-hidden rounded-xl shadow-inner border-4 border-yellow-500/50">
        
        {/* --- CỘT MENU NĂM (SIDEBAR) --- */}
        {/* SỬA: Mobile: Ngang (w-full, h-auto), PC: Dọc (w-24, h-full) */}
        <div className="w-full md:w-24 bg-white/90 backdrop-blur border-b-4 md:border-b-0 md:border-r-4 border-yellow-500 flex flex-row md:flex-col py-2 md:py-6 z-30 shrink-0 shadow-2xl items-center md:items-stretch overflow-hidden">
            {/* Tiêu đề "Niên Đại" - Chỉ hiện trên PC */}
            <div className="hidden md:block text-[12px] font-black text-center text-red-800 uppercase mb-6 font-serif tracking-widest border-b border-red-100 pb-2">Niên Đại</div>
            
            {/* Danh sách năm - Mobile: Cuộn ngang, PC: Cuộn dọc */}
            <div className="flex-1 flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto custom-scrollbar space-x-2 md:space-x-0 md:space-y-3 px-2 md:px-2 w-full">
                {timelineData.map((group) => (
                    <button 
                        key={group.year} 
                        onClick={() => scrollToYear(group.year)} 
                        // SỬA: whitespace-nowrap để không bị xuống dòng trên thanh ngang mobile
                        className={`shrink-0 px-4 py-1 md:py-2 rounded-lg text-[11px] font-bold transition-all duration-300 border-2 ${activeYear === group.year ? 'bg-red-800 text-yellow-300 border-yellow-400 shadow-md scale-105' : 'text-stone-500 border-transparent hover:bg-red-50 hover:text-red-600'}`}
                    >
                        {group.year}
                    </button>
                ))}
            </div>
        </div>

        {/* --- CỘT NỘI DUNG (MAIN CONTENT) --- */}
        <div className="flex-1 relative h-full flex flex-col">
            
            {/* LỚP NỀN: SAO VÀNG */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
                <div className="relative w-full h-full flex items-center justify-center pr-2 md:pr-4">
                    <svg viewBox="0 0 24 24" className="w-[80vmin] h-[80vmin] text-[#ffff00] drop-shadow-xl opacity-100 fill-current">
                        <path d="M12 1.73l2.42 7.46h7.84l-6.34 4.6 2.42 7.46-6.34-4.6-6.34 4.6 2.42-7.46-6.34-4.6h7.84z" />
                    </svg>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center mt-32 md:mt-48">
                        <h1 className="text-[6vw] font-serif font-black text-yellow-300 opacity-20 whitespace-nowrap select-none uppercase">
                            Hào Khí Việt Nam
                        </h1>
                    </div>
                </div>
            </div>

            {/* LỚP NỘI DUNG (CUỘN) */}
            <div className="absolute inset-0 overflow-y-auto scroll-smooth p-4 md:p-8 z-10 custom-scrollbar" id="timeline-container">
                <div className="relative flex flex-col items-center space-y-12 md:space-y-16 pb-32 w-full pt-6 md:pt-10">
                    
                    {/* Sư Tổ - Responsive gap */}
                    {grandMasters.length > 0 && (
                        <div className="flex flex-col items-center animate-in fade-in zoom-in duration-700 relative z-10">
                            <div className="flex gap-6 md:gap-10 justify-center flex-wrap px-2">{grandMasters.map(p => <MemberCard key={p.id} node={p} />)}</div>
                            <div className="h-16 w-2 bg-linear-to-b from-yellow-300 to-yellow-600 mt-6 shadow-[0_0_15px_rgba(255,255,0,0.8)] rounded-full"></div>
                        </div>
                    )}

                    {/* Trưởng Tràng */}
                    {masterHeads.length > 0 && (
                        <div className="flex flex-col items-center animate-in slide-in-from-bottom duration-700 delay-100 relative z-10">
                            <div className="flex gap-6 md:gap-10 justify-center flex-wrap px-2">{masterHeads.map(p => <MemberCard key={p.id} node={p} />)}</div>
                            <div className="h-20 w-1 border-l-4 border-dashed border-yellow-200/60 mt-6"></div>
                        </div>
                    )}

                    {/* Danh sách theo năm */}
                    <div className="w-full max-w-7xl space-y-16 md:space-y-20 relative z-10">
                        {timelineData.map((group) => (
                            <div key={group.year} id={`year-${group.year}`} className="relative flex flex-col items-center group">
                                {/* Thanh năm: Responsive text size */}
                                <div className="flex items-center gap-3 md:gap-6 w-full mb-8 md:mb-12">
                                    <div className="h-1 bg-linear-to-tr from-transparent via-yellow-400 to-transparent flex-1 opacity-50"></div>
                                    <div className="px-6 md:px-8 py-2 md:py-3 bg-[#b22222] text-yellow-300 rounded-2xl font-serif font-black text-lg md:text-xl shadow-2xl border-4 border-yellow-500 z-10 uppercase tracking-widest min-w-32 md:min-w-35 text-center relative">
                                        Năm {group.year}
                                        <div className="absolute top-1/2 -left-3 w-4 h-4 bg-yellow-400 rounded-full -translate-y-1/2 shadow border border-red-800"></div>
                                        <div className="absolute top-1/2 -right-3 w-4 h-4 bg-yellow-400 rounded-full -translate-y-1/2 shadow border border-red-800"></div>
                                    </div>
                                    <div className="h-1 bg-linear-to-tr from-transparent via-yellow-400 to-transparent flex-1 opacity-50"></div>
                                </div>
                                {/* Grid thành viên: Responsive gap */}
                                <div className="flex flex-wrap justify-center gap-x-4 gap-y-8 md:gap-x-8 md:gap-y-12 px-2 md:px-4">
                                    {group.members.map((person) => <MemberCard key={person.id} node={person} />)}
                                </div>
                            </div>
                        ))}
                        {timelineData.length === 0 && grandMasters.length === 0 && <div className="text-center text-yellow-100/50 italic font-serif text-xl md:text-2xl mt-20">Đang cập nhật dữ liệu...</div>}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}
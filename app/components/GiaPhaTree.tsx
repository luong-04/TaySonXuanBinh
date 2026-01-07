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
    // SƯ TỔ: Thẻ Vàng Kim
    cardStyle = "bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 border-4 border-red-600 shadow-[0_0_30px_rgba(255,215,0,0.6)] scale-110 z-30";
    avatarBorder = "border-red-700 ring-2 ring-yellow-200";
    nameColor = "text-red-900 drop-shadow-sm font-black";
    titleBg = "bg-red-900 border-red-950 text-yellow-300";
    titleText = "text-yellow-300";
    rankBadge = "bg-red-700 text-yellow-100 border-yellow-200 shadow-md";
  } else if (isMasterHead) {
    // TRƯỞNG TRÀNG: Thẻ Đỏ Huyết Dụ
    cardStyle = "bg-gradient-to-br from-red-800 via-red-900 to-[#4a0404] border-2 border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.5)] scale-105 z-20";
    avatarBorder = "border-yellow-400";
    nameColor = "text-yellow-400 font-bold";
    titleBg = "bg-yellow-900/50 border-yellow-500/50 text-yellow-200";
    titleText = "text-yellow-200";
    rankBadge = "bg-yellow-500 text-red-900 border-white shadow-md";
  } else {
    // THÀNH VIÊN: Thẻ Đỏ Nâu
    cardStyle = "bg-gradient-to-b from-[#8B0000] to-[#5c0000] border-2 border-[#b22222] shadow-lg hover:shadow-yellow-500/30 hover:scale-105 hover:border-yellow-500 transition-all z-10";
    avatarBorder = "border-[#a52a2a] group-hover:border-yellow-500";
    nameColor = "text-white group-hover:text-yellow-200";
    titleBg = "bg-black/30 border-white/10 text-stone-300";
    titleText = "text-stone-300 group-hover:text-white";
    rankBadge = "bg-stone-700 text-white border-stone-500";
  }

  return (
    <div className={`relative flex flex-col items-center p-3 rounded-xl transition-all duration-300 w-48 shrink-0 group ${cardStyle}`}>
        {/* Họa tiết chìm */}
        <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden rounded-xl">
             <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full border-4 border-white/10"></div>
             <div className="absolute top-8 -left-8 w-20 h-20 rounded-full border-2 border-white/5"></div>
        </div>

        {/* Avatar */}
        <div className="relative z-10">
            <div className={`w-20 h-20 rounded-full overflow-hidden border-4 shadow-inner ${avatarBorder} bg-stone-300`}>
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
                <div className={`text-[10px] font-black uppercase mb-1 tracking-widest ${isGrandMaster ? 'text-red-800' : 'text-yellow-500'}`}>
                    {isGrandMaster ? 'SƯ TỔ' : 'TRƯỞNG TRÀNG'}
                </div>
            )}
            <h3 className={`text-base font-serif leading-tight px-1 drop-shadow-md line-clamp-2 min-h-[1.5rem] ${nameColor}`}>
                {node.full_name ? node.full_name.normalize('NFC') : ''}
            </h3>
            <div className={`inline-flex items-center justify-center rounded-lg px-3 py-1 border mt-1 ${titleBg} backdrop-blur-md`}>
                <span className="text-[11px] font-bold">Đai {node.belt_level}</span>
                {node.title && (
                    <span className={`text-[11px] font-bold border-l pl-2 ml-2 ${isGrandMaster ? 'border-red-800' : 'border-white/20'} ${titleText}`}>
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
    // CONTAINER TỔNG: CỜ ĐỎ
    <div className="flex h-full w-full bg-[#da251d] overflow-hidden rounded-xl shadow-inner border-4 border-yellow-500/50">
        
        {/* --- CỘT TRÁI --- */}
        <div className="w-20 md:w-24 bg-white/90 backdrop-blur border-r-4 border-yellow-500 flex flex-col py-6 z-30 shrink-0 shadow-2xl">
            <div className="text-[12px] font-black text-center text-red-800 uppercase mb-6 font-serif tracking-widest border-b border-red-100 pb-2">Niên Đại</div>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 px-2">
                {timelineData.map((group) => (
                    <button key={group.year} onClick={() => scrollToYear(group.year)} className={`w-full text-center py-2 rounded-lg text-[11px] font-bold transition-all duration-300 border-2 ${activeYear === group.year ? 'bg-red-800 text-yellow-300 border-yellow-400 shadow-md scale-110' : 'text-stone-500 border-transparent hover:bg-red-50 hover:text-red-600'}`}>
                        {group.year}
                    </button>
                ))}
            </div>
        </div>

        {/* --- CỘT PHẢI --- */}
        <div className="flex-1 relative h-full flex flex-col">
            
            {/* LỚP NỀN: SAO VÀNG VIỆT NAM */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
                {/* ✅ SỬA LỖI LỆCH TRỤC: 
                   Thêm `pr-4` (padding-right) để bù trừ cho thanh cuộn (scrollbar) bên phải.
                   Điều này ép tâm của ngôi sao trùng khớp với tâm của nội dung danh sách.
                */}
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
            <div className="absolute inset-0 overflow-y-auto scroll-smooth p-8 z-10 custom-scrollbar" id="timeline-container">
                <div className="relative flex flex-col items-center space-y-16 pb-32 w-full pt-10">
                    
                    {grandMasters.length > 0 && (
                        <div className="flex flex-col items-center animate-in fade-in zoom-in duration-700 relative z-10">
                            <div className="flex gap-10 justify-center flex-wrap px-4">{grandMasters.map(p => <MemberCard key={p.id} node={p} />)}</div>
                            <div className="h-16 w-2 bg-gradient-to-b from-yellow-300 to-yellow-600 mt-6 shadow-[0_0_15px_rgba(255,255,0,0.8)] rounded-full"></div>
                        </div>
                    )}

                    {masterHeads.length > 0 && (
                        <div className="flex flex-col items-center animate-in slide-in-from-bottom duration-700 delay-100 relative z-10">
                            <div className="flex gap-10 justify-center flex-wrap px-4">{masterHeads.map(p => <MemberCard key={p.id} node={p} />)}</div>
                            <div className="h-20 w-1 border-l-4 border-dashed border-yellow-200/60 mt-6"></div>
                        </div>
                    )}

                    <div className="w-full max-w-7xl space-y-20 relative z-10">
                        {timelineData.map((group) => (
                            <div key={group.year} id={`year-${group.year}`} className="relative flex flex-col items-center group">
                                <div className="flex items-center gap-6 w-full mb-12">
                                    <div className="h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent flex-1 opacity-50"></div>
                                    <div className="px-8 py-3 bg-[#b22222] text-yellow-300 rounded-2xl font-serif font-black text-xl shadow-2xl border-4 border-yellow-500 z-10 uppercase tracking-widest min-w-[140px] text-center relative">
                                        Năm {group.year}
                                        <div className="absolute top-1/2 -left-3 w-4 h-4 bg-yellow-400 rounded-full -translate-y-1/2 shadow border border-red-800"></div>
                                        <div className="absolute top-1/2 -right-3 w-4 h-4 bg-yellow-400 rounded-full -translate-y-1/2 shadow border border-red-800"></div>
                                    </div>
                                    <div className="h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent flex-1 opacity-50"></div>
                                </div>
                                <div className="flex flex-wrap justify-center gap-x-8 gap-y-12 px-4">
                                    {group.members.map((person) => <MemberCard key={person.id} node={person} />)}
                                </div>
                            </div>
                        ))}
                        {timelineData.length === 0 && grandMasters.length === 0 && <div className="text-center text-yellow-100/50 italic font-serif text-2xl mt-20">Đang cập nhật dữ liệu...</div>}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}
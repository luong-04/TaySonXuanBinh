'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// --- ĐỊNH NGHĨA KIỂU DỮ LIỆU ---
interface Person {
  id: string; full_name: string; avatar_url: string | null; belt_level: number;
  national_rank: string | null; title: string | null; role: string; join_date: string; master_id: string | null;
  bio?: string;
}

interface YearGroup { year: number; members: Person[]; }

// --- COMPONENT MODAL (GIỮ NGUYÊN) ---
const BioModal = ({ node, onClose }: { node: Person; onClose: () => void }) => {
    const getBeltColor = (level: number) => {
        if (level >= 20) return { badge: 'bg-white text-stone-900 border border-stone-300' };
        if (level >= 16) return { badge: 'bg-yellow-500 text-red-900' };
        if (level >= 12) return { badge: 'bg-red-700 text-white' };
        if (level >= 8) return { badge: 'bg-green-700 text-white' };
        if (level >= 4) return { badge: 'bg-blue-700 text-white' };
        return { badge: 'bg-stone-900 text-stone-300 border border-stone-600' };
    };
    
    const beltStyle = getBeltColor(node.belt_level || 0);
    const isGrandMaster = node.role === 'grandmaster';
    const isMasterHead = node.role === 'master_head';

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div 
                className="bg-[#fdfbf7] w-full max-w-4xl h-[85vh] md:h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border-4 border-double border-red-900/20 relative animate-in zoom-in-95 duration-300"
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-2 right-2 md:top-4 md:right-4 z-50 w-8 h-8 md:w-10 md:h-10 bg-stone-200 hover:bg-red-600 hover:text-white rounded-full flex items-center justify-center text-lg md:text-xl font-bold transition-colors">&times;</button>

                <div className="shrink-0 bg-linear-to-b from-stone-100 to-white p-4 md:p-8 flex flex-col md:flex-row items-center gap-4 md:gap-6 border-b border-red-900/10">
                    <div className="w-24 h-24 md:w-40 md:h-40 rounded-full border-4 border-stone-200 shadow-xl overflow-hidden shrink-0 bg-stone-300">
                        <img src={node.avatar_url || "https://via.placeholder.com/150"} className="w-full h-full object-cover" />
                    </div>
                    <div className="text-center md:text-left space-y-1 md:space-y-2">
                        <h2 className="text-xl md:text-4xl font-serif font-black text-red-900 uppercase drop-shadow-sm leading-tight">
                            {node.full_name}
                        </h2>
                        <div className={`inline-block px-3 py-1 md:px-4 md:py-1.5 rounded-lg font-bold uppercase text-[10px] md:text-sm tracking-widest shadow-sm ${isGrandMaster ? 'bg-yellow-500 text-red-900' : isMasterHead ? 'bg-red-900 text-yellow-500' : beltStyle.badge}`}>
                            {isGrandMaster ? 'Sư Tổ' : isMasterHead ? 'Trưởng Tràng' : `Đai ${node.belt_level} • ${node.title || 'Võ Sinh'}`}
                        </div>
                        {node.national_rank && (
                            <p className="text-yellow-600 font-bold text-xs md:text-sm uppercase">★ {node.national_rank}</p>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-10 bg-white">
                    {node.bio ? (
                        <div className="prose prose-stone max-w-none text-sm md:text-lg leading-relaxed text-justify font-serif text-stone-800 whitespace-pre-wrap">
                            {node.bio}
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-stone-400 italic text-sm md:text-base">
                            Chưa có thông tin giới thiệu.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- CARD THÀNH VIÊN (GIỮ NGUYÊN) ---
const MemberCard = ({ node, onSelect }: { node: Person; onSelect: (p: Person) => void }) => {
  const isGrandMaster = node.role === 'grandmaster';
  const isMasterHead = node.role === 'master_head';

  const getBeltStyle = (level: number) => {
    if (level >= 20) return { border: 'border-white', bg: 'bg-white text-stone-900 border border-stone-300', nameHover: 'group-hover:text-white' };
    if (level >= 16) return { border: 'border-yellow-400', bg: 'bg-yellow-500 text-red-900', nameHover: 'group-hover:text-yellow-300' };
    if (level >= 12) return { border: 'border-red-600', bg: 'bg-red-700 text-white', nameHover: 'group-hover:text-red-300' };
    if (level >= 8) return { border: 'border-green-600', bg: 'bg-green-700 text-white', nameHover: 'group-hover:text-green-300' };
    if (level >= 4) return { border: 'border-blue-600', bg: 'bg-blue-700 text-white', nameHover: 'group-hover:text-blue-300' };
    return { border: 'border-stone-600', bg: 'bg-stone-800 text-stone-300 border border-stone-600', nameHover: 'group-hover:text-stone-300' };
  };

  const style = getBeltStyle(node.belt_level || 0);

  let cardClasses = "";
  let avatarBorder = "";
  let nameColor = "";
  let infoBadgeClass = "";

  if (isGrandMaster) {
    cardClasses = "bg-linear-to-br from-yellow-300 via-yellow-400 to-yellow-500 border-2 md:border-4 border-red-600 shadow-[0_0_15px_rgba(255,215,0,0.6)] scale-105 z-30";
    avatarBorder = "border-red-700 ring-1 md:ring-2 ring-yellow-200";
    nameColor = "text-red-900 font-black";
    infoBadgeClass = "bg-red-900 text-yellow-300 border-red-950";
  } else if (isMasterHead) {
    cardClasses = "bg-linear-to-br from-red-800 via-red-900 to-[#4a0404] border border-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.5)] z-20";
    avatarBorder = "border-yellow-400";
    nameColor = "text-yellow-400 font-bold";
    infoBadgeClass = "bg-yellow-900/80 text-yellow-200 border-yellow-500/50";
  } else {
    cardClasses = "bg-linear-to-b from-[#8B0000] to-[#5c0000] border border-[#b22222] shadow-md hover:shadow-yellow-500/30 hover:border-yellow-500 transition-all z-10";
    avatarBorder = `${style.border} group-hover:border-yellow-500`;
    nameColor = `text-white ${style.nameHover}`;
    infoBadgeClass = style.bg;
  }

  return (
    <div 
        className={`relative flex flex-col items-center p-2 md:p-3 rounded-lg md:rounded-xl transition-all duration-300 w-28 sm:w-36 md:w-48 shrink-0 group cursor-pointer ${cardClasses}`}
        onClick={() => onSelect(node)}
    >
        <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden rounded-xl">
             <div className="absolute -top-8 -right-8 w-16 h-16 md:w-24 md:h-24 rounded-full border-4 border-white/10"></div>
             <div className="absolute top-8 -left-8 w-12 h-12 md:w-20 md:h-20 rounded-full border-2 border-white/5"></div>
        </div>

        <div className="relative z-10">
            {node.bio && (
                <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 z-50 w-4 h-4 md:w-6 md:h-6 bg-yellow-400 text-red-900 rounded-full flex items-center justify-center text-[10px] md:text-[12px] font-black shadow border border-white animate-pulse">?</div>
            )}

            <div className={`w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-2 md:border-4 shadow-inner ${avatarBorder} bg-stone-300`}>
                <img src={node.avatar_url || "https://via.placeholder.com/150"} className="w-full h-full object-cover"/>
            </div>
            {node.national_rank && (
                 <div className="absolute -bottom-1.5 md:-bottom-2 left-1/2 -translate-x-1/2 text-[8px] md:text-[9px] px-1.5 py-0.5 rounded-full border border-white/20 font-bold uppercase whitespace-nowrap z-20 shadow-lg bg-stone-800 text-yellow-400">
                    ★ {node.national_rank}
                 </div>
            )}
        </div>

        <div className="mt-2 md:mt-4 text-center w-full z-10 space-y-0.5 md:space-y-1">
            {(isGrandMaster || isMasterHead) && (
                <div className={`text-[8px] md:text-[10px] font-black uppercase mb-0.5 tracking-widest ${isGrandMaster ? 'text-red-800' : 'text-yellow-500'}`}>
                    {isGrandMaster ? 'SƯ TỔ' : 'TRƯỞNG TRÀNG'}
                </div>
            )}
            <h3 className={`text-xs sm:text-sm md:text-base font-serif leading-tight px-0.5 drop-shadow-md line-clamp-2 min-h-[2rem] md:min-h-6 flex items-center justify-center ${nameColor}`}>
                {node.full_name}
            </h3>
            
            <div className={`inline-flex items-center justify-center rounded-md md:rounded-lg px-1.5 py-0.5 md:px-3 md:py-1 mt-1 backdrop-blur-md shadow-sm ${infoBadgeClass}`}>
                <span className="text-[9px] md:text-[11px] font-bold whitespace-nowrap">
                    Đai {node.belt_level}
                </span>
                {node.title && (
                    <span className="hidden sm:inline text-[10px] md:text-[11px] font-bold border-l border-current/40 pl-2 ml-2 opacity-90 whitespace-nowrap">
                        {node.title}
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
  
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*, bio').neq('role', 'student'); 
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

        const sortedGroups = Object.keys(groups)
          .map(y => ({ 
            year: parseInt(y), 
            members: groups[parseInt(y)].sort((a, b) => {
                const dateA = new Date(a.join_date || '9999-12-31').getTime();
                const dateB = new Date(b.join_date || '9999-12-31').getTime();
                return dateA - dateB;
            }) 
          }))
          .sort((a, b) => a.year - b.year);

        setTimelineData(sortedGroups);
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
    // SỬA LẦN CUỐI CÙNG: "CẮT GỌT" MẠNH TAY ĐỂ KHÔNG CÒN CROLL
    // - box-border: Đảm bảo viền 4px không làm phình kích thước
    // - Mobile: Trừ 11.5rem (dư dả cho Header + khoảng cách)
    // - Desktop: Trừ 16rem (trừ mạnh để chắc chắn nằm gọn trong màn hình laptop)
    <div className="flex flex-col md:flex-row h-[calc(100dvh-11.5rem)] md:h-[calc(100dvh-16rem)] w-full bg-[#da251d] overflow-hidden rounded-xl shadow-inner border-4 border-yellow-500/50 relative mt-1 mx-auto max-w-[99%] box-border">
        
        {/* --- CỘT MENU NĂM --- */}
        <div className="w-full md:w-24 bg-white/90 backdrop-blur border-b-4 md:border-b-0 md:border-r-4 border-yellow-500 flex flex-row md:flex-col py-2 md:py-6 z-30 shrink-0 shadow-2xl items-center md:items-stretch overflow-hidden">
            <div className="hidden md:block text-[12px] font-black text-center text-red-800 uppercase mb-6 font-serif tracking-widest border-b border-red-100 pb-2">Niên Đại</div>
            <div className="flex-1 flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto custom-scrollbar space-x-2 md:space-x-0 md:space-y-3 px-2 md:px-2 w-full">
                {timelineData.map((group) => (
                    <button 
                        key={group.year} 
                        onClick={() => scrollToYear(group.year)} 
                        className={`shrink-0 px-4 py-1 md:py-2 rounded-lg text-[11px] font-bold transition-all duration-300 border-2 ${activeYear === group.year ? 'bg-red-800 text-yellow-300 border-yellow-400 shadow-md scale-105' : 'text-stone-500 border-transparent hover:bg-red-50 hover:text-red-600'}`}
                    >
                        {group.year}
                    </button>
                ))}
            </div>
        </div>

        {/* --- CỘT NỘI DUNG (CHỈ CROLL Ở TRONG NÀY) --- */}
        <div className="flex-1 relative h-full flex flex-col">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
                <div className="relative w-full h-full flex items-center justify-center pr-2 md:pr-4">
                    <svg viewBox="0 0 24 24" className="w-[80vmin] h-[80vmin] text-[#ffff00] drop-shadow-xl opacity-100 fill-current">
                        <path d="M12 1.73l2.42 7.46h7.84l-6.34 4.6 2.42 7.46-6.34-4.6-6.34 4.6 2.42-7.46-6.34-4.6h7.84z" />
                    </svg>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center mt-32 md:mt-48">
                        <h1 className="text-[6vw] font-serif font-black text-yellow-300 opacity-20 whitespace-nowrap select-none uppercase">Hào Khí Việt Nam</h1>
                    </div>
                </div>
            </div>

            {/* Khung chứa nội dung cuộn */}
            <div className="absolute inset-0 overflow-y-auto scroll-smooth p-2 md:p-8 z-10 custom-scrollbar" id="timeline-container">
                <div className="relative flex flex-col items-center space-y-8 md:space-y-16 pb-32 w-full pt-6 md:pt-10">
                    
                    {/* Sư Tổ */}
                    {grandMasters.length > 0 && (
                        <div className="flex flex-col items-center animate-in fade-in zoom-in duration-700 relative z-10">
                            <div className="flex gap-4 md:gap-10 justify-center flex-wrap px-1">{grandMasters.map(p => <MemberCard key={p.id} node={p} onSelect={setSelectedPerson} />)}</div>
                            <div className="h-12 md:h-16 w-2 bg-linear-to-b from-yellow-300 to-yellow-600 mt-4 md:mt-6 shadow-[0_0_15px_rgba(255,255,0,0.8)] rounded-full"></div>
                        </div>
                    )}

                    {/* Trưởng Tràng */}
                    {masterHeads.length > 0 && (
                        <div className="flex flex-col items-center animate-in slide-in-from-bottom duration-700 delay-100 relative z-10">
                            <div className="flex gap-4 md:gap-10 justify-center flex-wrap px-1">{masterHeads.map(p => <MemberCard key={p.id} node={p} onSelect={setSelectedPerson} />)}</div>
                            <div className="h-16 md:h-20 w-1 border-l-4 border-dashed border-yellow-200/60 mt-4 md:mt-6"></div>
                        </div>
                    )}

                    {/* Danh sách theo năm */}
                    <div className="w-full max-w-7xl space-y-12 md:space-y-20 relative z-10">
                        {timelineData.map((group) => (
                            <div key={group.year} id={`year-${group.year}`} className="relative flex flex-col items-center group w-full">
                                <div className="flex items-center gap-2 md:gap-6 w-full mb-6 md:mb-12">
                                    <div className="h-1 bg-linear-to-tr from-transparent via-yellow-400 to-transparent flex-1 opacity-50"></div>
                                    <div className="px-4 md:px-8 py-2 md:py-3 bg-[#b22222] text-yellow-300 rounded-xl md:rounded-2xl font-serif font-black text-base md:text-xl shadow-2xl border-2 md:border-4 border-yellow-500 z-10 uppercase tracking-widest min-w-24 md:min-w-35 text-center relative">
                                        Năm {group.year}
                                        <div className="absolute top-1/2 -left-2 md:-left-3 w-3 h-3 md:w-4 md:h-4 bg-yellow-400 rounded-full -translate-y-1/2 shadow border border-red-800"></div>
                                        <div className="absolute top-1/2 -right-2 md:-right-3 w-3 h-3 md:w-4 md:h-4 bg-yellow-400 rounded-full -translate-y-1/2 shadow border border-red-800"></div>
                                    </div>
                                    <div className="h-1 bg-linear-to-tr from-transparent via-yellow-400 to-transparent flex-1 opacity-50"></div>
                                </div>
                                <div className="flex flex-wrap justify-center gap-3 md:gap-8 w-full px-1">
                                    {group.members.map((person) => <MemberCard key={person.id} node={person} onSelect={setSelectedPerson} />)}
                                </div>
                            </div>
                        ))}
                        {timelineData.length === 0 && grandMasters.length === 0 && <div className="text-center text-yellow-100/50 italic font-serif text-lg md:text-2xl mt-20">Đang cập nhật dữ liệu...</div>}
                    </div>
                </div>
            </div>
        </div>

        {selectedPerson && <BioModal node={selectedPerson} onClose={() => setSelectedPerson(null)} />}
    </div>
  );
}
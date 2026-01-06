'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Person {
  id: string;
  full_name: string;
  avatar_url: string | null;
  belt_level: number;
  national_rank: string | null;
  title: string | null;
  role: string;
  join_date: string;
  master_id: string | null;
}

interface YearGroup {
  year: number;
  members: Person[];
}

// --- CARD THÀNH VIÊN ---
const MemberCard = ({ node }: { node: Person }) => {
  let borderColor = 'border-red-900/30';
  let bgColor = 'bg-[#fdfbf7]';
  let shadow = 'shadow-sm hover:shadow-md';
  let scale = 'scale-100 hover:scale-105';
  let roleLabel = '';

  if (node.role === 'grandmaster') { 
      bgColor = 'bg-yellow-50'; 
      borderColor = 'border-yellow-600';
      shadow = 'shadow-xl shadow-yellow-500/20';
      roleLabel = 'SƯ TỔ';
  } else if (node.role === 'master_head') {
      bgColor = 'bg-red-50';
      borderColor = 'border-red-800';
      roleLabel = 'TRƯỞNG TRÀNG';
  }

  return (
    <div className={`relative flex flex-col items-center p-3 rounded-lg border-2 ${borderColor} ${bgColor} ${shadow} ${scale} transition-all duration-300 w-44 shrink-0`}>
        {/* Avatar */}
        <div className="relative">
            <div className={`w-20 h-20 rounded-full overflow-hidden border-4 ${node.role === 'grandmaster' ? 'border-yellow-500' : 'border-gray-300'} bg-gray-100`}>
                <img 
                    src={node.avatar_url || "https://via.placeholder.com/150?text=IMG"} 
                    alt={node.full_name} 
                    className="w-full h-full object-cover"
                />
            </div>
            {/* Đẳng quốc gia hiện ngôi sao */}
            {node.national_rank && (
                 <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-600 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white shadow animate-pulse" title={node.national_rank}>★</div>
            )}
        </div>

        {/* Thông tin */}
        <div className="mt-3 text-center w-full">
            {roleLabel && (
                <div className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">
                    {roleLabel}
                </div>
            )}

            <h3 className="text-sm font-serif font-bold text-red-900 uppercase leading-tight break-words min-h-[1.5em] flex items-center justify-center px-1">
                {node.full_name}
            </h3>
            
            <div className="mt-2 flex flex-col gap-1 items-center justify-center">
                
                {/* HÀNG CẤP ĐAI + DANH HIỆU (Nổi bật) */}
                <div className="flex items-center gap-1">
                    {/* Cấp đai */}
                    <span className="text-[10px] px-2 py-0.5 rounded-l-md font-mono font-bold bg-gray-200 text-gray-700 border border-gray-300 border-r-0">
                        Đai {node.belt_level}
                    </span>
                    
                    {/* Danh hiệu (Nếu có thì hiện màu Vàng/Đỏ nổi bật) */}
                    {node.title ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-r-md font-bold bg-yellow-400 text-red-900 border border-yellow-500 uppercase tracking-tight">
                            {node.title}
                        </span>
                    ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-r-md font-bold bg-white text-gray-400 border border-gray-300">
                            ---
                        </span>
                    )}
                </div>

                {/* Đẳng quốc gia (Hiện chữ bên dưới) */}
                {node.national_rank && (
                    <span className="text-[9px] text-red-600 font-bold uppercase mt-0.5">
                        {node.national_rank}
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
    const { data, error } = await supabase.from('profiles').select('*');

    if (error || !data) { setLoading(false); return; }

    const profiles = data as Person[];

    const gms = profiles.filter(p => p.role === 'grandmaster');
    const mhs = profiles.filter(p => p.role === 'master_head');
    const others = profiles.filter(p => p.role !== 'grandmaster' && p.role !== 'master_head');

    setGrandMasters(gms);
    setMasterHeads(mhs);

    const groups: Record<number, Person[]> = {};
    others.forEach(p => {
        const date = new Date(p.join_date || '2024-01-01');
        const year = date.getFullYear();
        if (!groups[year]) groups[year] = [];
        groups[year].push(p);
    });

    const sortedGroups: YearGroup[] = Object.keys(groups)
        .map(yearStr => {
            const year = parseInt(yearStr);
            const members = groups[year].sort((a, b) => 
                new Date(a.join_date).getTime() - new Date(b.join_date).getTime()
            );
            return { year, members };
        })
        .sort((a, b) => a.year - b.year);

    setTimelineData(sortedGroups);
    if(sortedGroups.length > 0) setActiveYear(sortedGroups[0].year);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const scrollToYear = (year: number) => {
      const element = document.getElementById(`year-${year}`);
      if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setActiveYear(year);
      }
  };

  if (loading) return <div className="text-center p-10 font-serif text-red-900 animate-pulse">⏳ Đang tra cứu niên sử...</div>;

  return (
    <div className="flex h-[calc(100vh-140px)] border-2 border-red-900/20 rounded-xl bg-[#fdfbf7] overflow-hidden relative">
        
        {/* SIDEBAR */}
        <div className="w-16 md:w-24 bg-red-900 text-yellow-50 flex flex-col border-r-4 border-yellow-600 shadow-xl z-20 shrink-0">
            <div className="p-2 font-serif font-bold text-center border-b border-red-800 bg-red-950 text-[10px] md:text-xs uppercase tracking-widest">
                Mục Lục
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar py-2 space-y-1">
                {timelineData.map((group) => (
                    <button
                        key={group.year}
                        onClick={() => scrollToYear(group.year)}
                        className={`w-full text-center py-2 px-1 text-[10px] md:text-xs font-serif transition-colors relative group
                            ${activeYear === group.year ? 'bg-yellow-600 text-red-950 font-bold' : 'hover:bg-red-800 text-yellow-200'}
                        `}
                    >
                        <span>{group.year}</span>
                    </button>
                ))}
            </div>
            <button onClick={fetchData} className="p-2 text-center text-xs bg-red-950 hover:bg-red-800 border-t border-red-800 text-yellow-500">↻</button>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 overflow-y-auto scroll-smooth bg-[url('/bg-grid.png')] relative p-4 md:p-8" id="timeline-container">
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-[0.03] z-0">
                <h1 className="text-[60px] md:text-[100px] font-serif font-black text-red-900 -rotate-45 whitespace-nowrap">
                    NIÊN SỬ KÝ
                </h1>
            </div>

            <div className="relative z-10 flex flex-col items-center space-y-12 pb-20">
                
                {grandMasters.length > 0 && (
                    <div className="flex flex-col items-center animate-in zoom-in duration-500">
                        <div className="flex gap-6 justify-center flex-wrap">
                            {grandMasters.map(p => <MemberCard key={p.id} node={p} />)}
                        </div>
                        <div className="h-8 w-1 bg-gradient-to-b from-yellow-600 to-red-900/50 mt-4 rounded-full"></div>
                    </div>
                )}

                {masterHeads.length > 0 && (
                    <div className="flex flex-col items-center animate-in slide-in-from-bottom duration-500 delay-100">
                        <div className="flex gap-6 justify-center flex-wrap">
                            {masterHeads.map(p => <MemberCard key={p.id} node={p} />)}
                        </div>
                        <div className="h-10 w-0.5 bg-red-900/30 mt-4 dashed-line"></div>
                    </div>
                )}

                <div className="w-full max-w-4xl space-y-12">
                    {timelineData.map((group) => (
                        <div key={group.year} id={`year-${group.year}`} className="relative flex flex-col items-center">
                            <div className="flex items-center gap-4 w-full mb-6">
                                <div className="h-px bg-red-900/20 flex-1"></div>
                                <div className="px-4 py-1 bg-red-900 text-yellow-50 rounded-full font-serif font-bold text-sm shadow-md border-2 border-yellow-600/50">
                                    Năm {group.year}
                                </div>
                                <div className="h-px bg-red-900/20 flex-1"></div>
                            </div>
                            <div className="flex flex-wrap justify-center gap-6 md:gap-8">
                                {group.members.map((person) => (
                                    <MemberCard key={person.id} node={person} />
                                ))}
                            </div>
                        </div>
                    ))}
                    
                    {timelineData.length === 0 && grandMasters.length === 0 && (
                         <div className="text-center text-gray-400 italic">Chưa có dữ liệu.</div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
}
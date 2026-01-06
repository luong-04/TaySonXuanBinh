'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Kiểu dữ liệu cho một người
interface Person {
  id: string;
  full_name: string;
  avatar_url: string | null;
  belt_level: number;
  is_national_rank: boolean;
  title: string | null;
  role: string;
  join_date: string;
  master_id: string | null;
  children?: Person[]; // Danh sách đệ tử
}

// 1. Component hiển thị thẻ thông tin 1 người (Card)
const PersonCard = ({ node }: { node: Person }) => {
  // Màu sắc viền theo chức vụ
  let borderColor = 'border-gray-300';
  let bgColor = 'bg-white';
  
  if (node.role === 'grandmaster') { borderColor = 'border-yellow-500'; bgColor = 'bg-yellow-50'; }
  else if (node.role === 'master_head') { borderColor = 'border-red-500'; bgColor = 'bg-red-50'; }

  return (
    <div className="flex flex-col items-center mx-4 mb-6 relative group z-10">
      {/* Đường kẻ nối lên sư phụ (trừ Sư tổ) */}
      {node.role !== 'grandmaster' && (
        <div className="absolute -top-8 left-1/2 w-px h-8 bg-gray-400"></div>
      )}

      <div className={`relative border-2 ${borderColor} ${bgColor} p-2 rounded-lg shadow-lg w-32 text-center transition-transform hover:scale-105`}>
        {/* Ảnh đại diện */}
        <div className="w-16 h-16 mx-auto rounded-full overflow-hidden border border-gray-200 bg-gray-100">
           <img 
             src={node.avatar_url || "https://via.placeholder.com/150?text=IMG"} 
             alt={node.full_name} 
             className="w-full h-full object-cover"
           />
        </div>

        {/* Chấm màu: Đẳng quốc gia */}
        {node.is_national_rank && (
          <div className="absolute top-2 right-2 w-3 h-3 bg-red-600 rounded-full animate-pulse border border-white" title="Đẳng Quốc Gia"></div>
        )}

        {/* Tên & Thông tin */}
        <h3 className="font-bold text-sm mt-2 break-words leading-tight">{node.full_name}</h3>
        
        <div className="mt-1 text-xs text-gray-600 space-y-0.5">
          {node.title && <p className="text-red-800 font-semibold">{node.title}</p>}
          <p>Đai: {node.belt_level}/22</p>
        </div>
      </div>

      {/* Đường kẻ nối xuống đệ tử (nếu có) */}
      {node.children && node.children.length > 0 && (
        <div className="absolute -bottom-8 left-1/2 w-px h-8 bg-gray-400"></div>
      )}
    </div>
  );
};

// 2. Component Đệ Quy (Vẽ cây)
const TreeNode = ({ node }: { node: Person }) => {
  return (
    <div className="flex flex-col items-center">
      <PersonCard node={node} />
      
      {/* Vẽ hàng đệ tử bên dưới */}
      {node.children && node.children.length > 0 && (
        <div className="flex flex-row items-start justify-center pt-8 relative">
          {/* Đường kẻ ngang nối các đệ tử */}
          {node.children.length > 1 && (
             <div className="absolute top-0 left-0 w-full h-px bg-gray-400 mt-0" 
                  style={{ 
                    left: 'calc(50% / ' + node.children.length + ')', 
                    width: 'calc(100% - (100% / ' + node.children.length + '))' 
                  }}
             ></div>
          )}
          
          {/* Loop đệ quy */}
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} />
          ))}
        </div>
      )}
    </div>
  );
};

// 3. Component Chính (Lấy dữ liệu và xử lý)
export default function GiaPhaTree() {
  const [treeData, setTreeData] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      // Lấy toàn bộ danh sách, sắp xếp theo ngày nhập môn
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('join_date', { ascending: true }); // Người vào trước đứng trước (trái/trên)

      if (error || !data) {
        setLoading(false);
        return;
      }

      const profiles = data as Person[];

      // Xây dựng cây (Map list -> Tree)
      const buildTree = (list: Person[]) => {
        const map: { [key: string]: number } = {};
        const roots: Person[] = [];
        
        // Tạo index để tìm cho nhanh
        list.forEach((node, i) => {
          node.children = [];
          map[node.id] = i;
        });

        // Gắn con vào cha
        list.forEach((node) => {
          if (node.master_id && map[node.master_id] !== undefined) {
            list[map[node.master_id]].children?.push(node);
          } else {
            // Nếu không có sư phụ (hoặc sư phụ không có trong list này) -> Là Sư tổ (gốc)
            roots.push(node);
          }
        });
        
        // Mặc định trả về ông to nhất (Sư tổ)
        return roots.length > 0 ? roots[0] : null;
      };

      setTreeData(buildTree(profiles));
      setLoading(false);
    }

    fetchData();
  }, []);

  if (loading) return <div className="text-center p-10">Đang tải gia phả...</div>;
  if (!treeData) return <div className="text-center p-10">Chưa có dữ liệu Sư Tổ. Hãy thêm người dùng đầu tiên.</div>;

  return (
    <div className="overflow-auto p-10 cursor-grab active:cursor-grabbing border rounded-xl bg-slate-50 min-h-[600px]">
      <div className="min-w-max mx-auto">
        <TreeNode node={treeData} />
      </div>
    </div>
  );
}
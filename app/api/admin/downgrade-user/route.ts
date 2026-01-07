import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) throw new Error("Thiếu ID người dùng");

    // 1. Lấy Auth ID
    const { data: profile } = await supabaseAdmin.from('profiles').select('auth_id').eq('id', id).single();

    // 2. Xóa Auth (Email/Pass) -> QUAN TRỌNG
    if (profile?.auth_id) {
        await supabaseAdmin.auth.admin.deleteUser(profile.auth_id);
    }

    // 3. Cập nhật Profile về trạng thái Võ sinh
    // Đã xóa trường 'password' gây lỗi
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        role: 'student',       // Về làm võ sinh
        auth_id: null,         // Ngắt liên kết
        email: null,           // Xóa email hiển thị
        club_role: null,       // Xóa chức vụ CLB
      })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
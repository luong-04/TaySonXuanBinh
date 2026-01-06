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

    // 1. Lấy thông tin Profile trước khi xóa để kiểm tra auth_id (nếu cần)
    // Nhưng cách nhanh nhất là cứ xóa Profile trước.
    
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', id);

    if (profileError) throw profileError;

    // 2. Cố gắng xóa User trong Auth (Nếu có)
    // Dùng try-catch để nếu không tìm thấy User (User not found) thì KỆ NÓ, không báo lỗi.
    try {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
      
      if (authError) {
        // Chỉ log ra server để biết, không throw error ra ngoài
        console.log(`[Info] Không xóa được Auth User (có thể do chưa tồn tại): ${authError.message}`);
      }
    } catch (ignoreError) {
      // Bỏ qua mọi lỗi liên quan đến xóa Auth, vì mục tiêu chính là xóa Profile đã xong ở bước 1
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Lỗi xóa user:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
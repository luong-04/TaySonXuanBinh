import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { studentId, email, password } = await req.json();

    if (!studentId || !email || !password) {
      throw new Error("Thiếu thông tin cần thiết (ID, Email hoặc Mật khẩu)");
    }

    // 1. Tạo tài khoản đăng nhập mới (Auth User)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Tự động xác thực email
    });

    if (authError) throw authError;

    // 2. Cập nhật hồ sơ Võ sinh cũ -> Biến thành HLV
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        auth_id: authData.user.id, // Liên kết với tài khoản vừa tạo
        email: email,              // Cập nhật email chính xác
        role: 'instructor'         // Nâng quyền lên HLV
      })
      .eq('id', studentId);        // Tìm đúng ID võ sinh đó

    if (profileError) {
      // Nếu update lỗi thì xóa luôn cái Auth vừa tạo để tránh rác
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
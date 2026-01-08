import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return NextResponse.json({ error: "Thiếu Service Role Key" }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { id } = await req.json();
    if (!id) throw new Error("Thiếu ID người dùng");

    // 1. LẤY THÔNG TIN AUTH_ID TRƯỚC KHI XÓA
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('auth_id')
      .eq('id', id)
      .single();

    if (fetchError || !profile) throw new Error("Không tìm thấy hồ sơ người dùng");

    // 2. XÓA TÀI KHOẢN BÊN AUTHENTICATION (Xóa Email/Pass)
    if (profile.auth_id) {
        const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(profile.auth_id);
        if (deleteAuthError) {
            console.error("Lỗi xóa Auth:", deleteAuthError.message);
            // Có thể bỏ qua nếu user đã bị xóa trước đó hoặc không tồn tại bên Auth
        }
    }

    // 3. CẬP NHẬT LẠI PROFILE VỀ TRẠNG THÁI VÕ SINH
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        role: 'student',       // Trở về làm võ sinh
        auth_id: null,         // Ngắt liên kết Auth
        email: null,           // Xóa email (vì không còn tài khoản đăng nhập)
        club_role: null        // Xóa chức vụ
      })
      .eq('id', id);

    if (profileError) throw profileError;

    return NextResponse.json({ 
        success: true, 
        message: "Đã xóa tài khoản đăng nhập và hạ cấp xuống võ sinh thành công." 
    });

  } catch (error: any) {
    console.error("Downgrade Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
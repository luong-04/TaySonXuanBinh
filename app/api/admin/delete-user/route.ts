import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { id } = await req.json(); // Đây là Profile ID
    if (!id) throw new Error("Thiếu ID người dùng");

    // 1. Lấy thông tin Auth ID từ Profile trước khi làm bất cứ gì
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('auth_id, avatar_url')
      .eq('id', id)
      .single();

    // 2. Xóa tài khoản Auth (Email/Pass) nếu tồn tại
    if (profile?.auth_id) {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(profile.auth_id);
      if (authError) {
        console.error("Lỗi xóa Auth:", authError);
        // Không throw lỗi ở đây để đảm bảo vẫn xóa được Profile bên dưới
      }
    }

    // 3. Xóa ảnh đại diện (Dọn rác)
    if (profile?.avatar_url) {
        const path = profile.avatar_url.split('/storage/v1/object/public/assets/')[1];
        if (path) await supabaseAdmin.storage.from('assets').remove([path]);
    }

    // 4. Xóa Profile trong Database
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', id);

    if (profileError) throw profileError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API Delete Error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
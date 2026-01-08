import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// QUAN TRỌNG: Đã xóa export const config vì gây lỗi 405 trên App Router

export async function POST(req: Request) {
  try {
    // 1. KIỂM TRA BIẾN MÔI TRƯỜNG
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return NextResponse.json({ 
            success: false, 
            error: "LỖI SERVER: Thiếu Service Role Key trên Vercel." 
        }, { status: 500 });
    }

    // 2. KHỞI TẠO CLIENT ADMIN
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    const body = await req.json();
    const { id, email, password, full_name, ...profileData } = body;

    if (!id) throw new Error("Thiếu ID người dùng");

    // 3. LOGIC XỬ LÝ AUTH
    const { data: currentProfile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('auth_id')
      .eq('id', id)
      .single();

    if (fetchError || !currentProfile) throw new Error("Không tìm thấy hồ sơ người dùng này");

    let authIdToUpdate = currentProfile.auth_id;
    let isNewAuth = false;
    const hasAuthData = email || (password && password.trim() !== "");

    if (hasAuthData) {
        if (authIdToUpdate) {
            const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(authIdToUpdate);
            if (!authUser) authIdToUpdate = null;
        }

        if (authIdToUpdate) {
            // CẬP NHẬT USER CŨ
            const authUpdates: any = {};
            if (email) authUpdates.email = email;
            if (password && password.trim() !== "") authUpdates.password = password;
            const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(authIdToUpdate, authUpdates);
            if (updateAuthError) throw updateAuthError;
        } else {
            // TẠO USER MỚI
            if (!email || !password) throw new Error("Cần nhập đủ Email và Mật khẩu để cấp quyền!");
            const { data: newAuthData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
                email: email, 
                password: password, 
                email_confirm: true, 
                user_metadata: { full_name: full_name }
            });
            if (createAuthError) throw createAuthError;
            authIdToUpdate = newAuthData.user.id;
            isNewAuth = true;
        }
    }

    // 4. CẬP NHẬT TABLE PROFILES
    const updateData: any = { ...profileData };
    
    // Làm sạch dữ liệu trước khi lưu
    if (updateData.master_id === '') updateData.master_id = null;
    if (updateData.club_id === '') updateData.club_id = null;
    if (updateData.join_date === '') updateData.join_date = null;
    if (updateData.dob === '') updateData.dob = null;
    if (typeof updateData.belt_level !== 'undefined') updateData.belt_level = Number(updateData.belt_level) || 0;
    
    if (email) updateData.email = email;
    if (full_name) updateData.full_name = full_name;
    if (isNewAuth) updateData.auth_id = authIdToUpdate;

    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', id);

    if (profileError) throw profileError;

    return NextResponse.json({ 
        success: true, 
        message: isNewAuth ? "Đã cấp tài khoản mới" : "Cập nhật thành công" 
    });

  } catch (error: any) {
    console.error("API Update Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
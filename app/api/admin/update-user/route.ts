import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, email, password, fullName, ...profileData } = body;

    if (!id) throw new Error("Thiếu ID người dùng");

    // 1. Lấy thông tin Profile hiện tại
    const { data: currentProfile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('auth_id')
      .eq('id', id)
      .single();

    if (fetchError || !currentProfile) {
      throw new Error("Không tìm thấy hồ sơ người dùng này");
    }

    let authIdToUpdate = currentProfile.auth_id;
    let isNewAuth = false;

    // --- LOGIC QUAN TRỌNG: CHỈ XỬ LÝ AUTH NẾU CÓ GỬI EMAIL HOẶC PASS ---
    // (Nếu chỉ sửa tên, ngày sinh... thì bỏ qua đoạn này để tránh lỗi cho Võ sinh)
    const hasAuthData = email || (password && password.trim() !== "");

    if (hasAuthData) {
        
        // Kiểm tra xem User có tồn tại bên hệ thống Auth không
        if (authIdToUpdate) {
            const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(authIdToUpdate);
            if (!authUser) authIdToUpdate = null; // Có ID rác nhưng không có user thật -> Coi như chưa có
        }

        if (authIdToUpdate) {
            // === TRƯỜNG HỢP A: ĐÃ CÓ TÀI KHOẢN -> CẬP NHẬT ===
            const authUpdates: any = {};
            if (email) authUpdates.email = email;
            if (password && password.trim() !== "") authUpdates.password = password;

            const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
                authIdToUpdate,
                authUpdates
            );
            if (updateAuthError) throw updateAuthError;

        } else {
            // === TRƯỜNG HỢP B: CHƯA CÓ TÀI KHOẢN -> TẠO MỚI (CẤP QUYỀN) ===
            // Bắt buộc phải có đủ cả Email và Pass mới cho tạo
            if (!email || !password) {
                 throw new Error("Người này chưa có tài khoản. Để cấp quyền, bạn phải nhập đủ Email và Mật khẩu!");
            }

            const { data: newAuthData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
                email: email,
                password: password,
                email_confirm: true,
                user_metadata: { full_name: fullName }
            });

            if (createAuthError) throw createAuthError;

            authIdToUpdate = newAuthData.user.id;
            isNewAuth = true;
        }
    }

    // 2. Cập nhật thông tin Profile (Luôn chạy)
    const updateData = { ...profileData };

    // Làm sạch dữ liệu
    if (updateData.master_id === '') updateData.master_id = null;
    if (updateData.club_id === '') updateData.club_id = null;
    if (updateData.join_date === '') updateData.join_date = null;
    if (updateData.dob === '') updateData.dob = null;
    
    // Fix lỗi NaN cho cấp đai
    if (typeof updateData.belt_level !== 'undefined') {
        updateData.belt_level = Number(updateData.belt_level) || 0;
    }

    if (email) updateData.email = email;
    if (fullName) updateData.full_name = fullName;
    
    // Nếu vừa tạo Auth mới thì cập nhật ID vào profile
    if (isNewAuth) {
      updateData.auth_id = authIdToUpdate;
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', id);

    if (profileError) throw profileError;

    return NextResponse.json({ success: true, message: isNewAuth ? "Đã cấp tài khoản mới" : "Cập nhật thành công" });
  } catch (error: any) {
    console.error("API Update Error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
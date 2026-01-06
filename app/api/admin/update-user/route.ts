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

    // BƯỚC 1: Lấy thông tin Profile hiện tại để xem đã có Auth chưa
    const { data: currentProfile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('auth_id, email')
      .eq('id', id)
      .single();

    if (fetchError || !currentProfile) {
      throw new Error("Không tìm thấy hồ sơ người dùng này trong Database");
    }

    let authIdToUpdate = currentProfile.auth_id;
    let isNewAuth = false;

    // BƯỚC 2: Kiểm tra User bên hệ thống Auth
    if (authIdToUpdate) {
      // Nếu profile đã có auth_id, thử lấy user đó xem có tồn tại không
      const { data: authUser, error: checkAuthError } = await supabaseAdmin.auth.admin.getUserById(authIdToUpdate);
      
      if (checkAuthError || !authUser) {
        // Có ID trong profile nhưng không tìm thấy trong Auth -> Coi như chưa có
        authIdToUpdate = null; 
      }
    }

    // BƯỚC 3: Xử lý Cập nhật hoặc Tạo mới Auth
    if (authIdToUpdate) {
      // === TRƯỜNG HỢP A: ĐÃ CÓ TÀI KHOẢN AUTH -> CẬP NHẬT ===
      const authUpdates: any = {};
      if (email) authUpdates.email = email;
      if (password && password.trim() !== "") authUpdates.password = password;

      if (Object.keys(authUpdates).length > 0) {
        const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
          authIdToUpdate,
          authUpdates
        );
        if (updateAuthError) throw updateAuthError;
      }
    } else {
      // === TRƯỜNG HỢP B: CHƯA CÓ TÀI KHOẢN AUTH -> TẠO MỚI (CẤP QUYỀN) ===
      if (!email || !password) {
        throw new Error("User này được tạo từ SQL chưa có tài khoản. Vui lòng nhập Email và Mật khẩu để cấp quyền!");
      }

      const { data: newAuthData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
      });

      if (createAuthError) throw createAuthError;

      // Lưu lại ID mới để tí nữa update vào Profile
      authIdToUpdate = newAuthData.user.id;
      isNewAuth = true;
    }

    // BƯỚC 4: Cập nhật thông tin Profile
    const updateData = { ...profileData };

    // Làm sạch dữ liệu rỗng
    if (updateData.master_id === '') updateData.master_id = null;
    if (updateData.club_id === '') updateData.club_id = null;
    if (updateData.join_date === '') updateData.join_date = null;
    if (updateData.dob === '') updateData.dob = null;

    if (email) updateData.email = email;
    if (fullName) updateData.full_name = fullName;
    
    // QUAN TRỌNG: Nếu vừa tạo Auth mới, phải cập nhật auth_id vào Profile
    if (isNewAuth) {
      updateData.auth_id = authIdToUpdate;
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', id);

    if (profileError) throw profileError;

    return NextResponse.json({ success: true, message: isNewAuth ? "Đã cấp tài khoản mới thành công" : "Đã cập nhật thành công" });
  } catch (error: any) {
    console.error("Lỗi API Update:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
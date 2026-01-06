import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import crypto from 'crypto'; // Dùng để tạo ID ngẫu nhiên cho võ sinh

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, fullName, role, ...otherData } = body;

    let userId = null; 
    let profileId = undefined;

    // 1. Tạo tài khoản Auth (Chỉ dành cho HLV/Admin có email/pass)
    if (email && password) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
      });
      if (authError) throw authError;
      userId = authData.user.id;
      profileId = userId; // Nếu có Auth, ID hồ sơ = ID Auth
    } else {
      // Nếu là Võ sinh (không Auth), tự tạo UUID ngẫu nhiên cho hồ sơ
      profileId = crypto.randomUUID();
    }

    // 2. Chuẩn bị dữ liệu Profile sạch sẽ
    const profileData = { ...otherData };

    // --- FIX LỖI QUAN TRỌNG ---
    if (profileData.master_id === '') profileData.master_id = null;
    if (profileData.club_id === '') profileData.club_id = null;
    if (profileData.join_date === '') profileData.join_date = null;
    if (profileData.dob === '') profileData.dob = null;
    
    // Đảm bảo cấp đai là số (tránh NaN)
    if (typeof profileData.belt_level !== 'number' || isNaN(profileData.belt_level)) {
        profileData.belt_level = 0;
    }
    // --------------------------

    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: profileId,        // Luôn có ID (tự tạo hoặc từ Auth)
      auth_id: userId,      // Có thể null nếu là võ sinh
      email: email || null, // Có thể null
      full_name: fullName,
      role: role || 'student',
      ...profileData
    });

    if (profileError) {
      // Nếu tạo profile lỗi mà lỡ tạo Auth rồi thì xóa Auth đi để tránh rác
      if (userId) await supabaseAdmin.auth.admin.deleteUser(userId);
      throw profileError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Create User Error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
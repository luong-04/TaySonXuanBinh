import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Tạo client quyền Admin tối cao
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

    // 1. Tạo user Auth (Nếu có email/pass)
    if (email && password) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true 
      });
      if (authError) throw authError;
      userId = authData.user.id;
    }

    // --- ĐOẠN FIX LỖI UUID: "" ---
    // Loại bỏ các trường ID bị rỗng "" chuyển thành null
    const profileData = { ...otherData };
    if (profileData.master_id === '') profileData.master_id = null;
    if (profileData.club_id === '') profileData.club_id = null;
    // -----------------------------

    // 2. Tạo thông tin Profile
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: userId || undefined, // Nếu userId null thì để DB tự sinh UUID
      auth_id: userId,
      email,
      full_name: fullName,
      role: role || 'student',
      ...profileData // Dữ liệu đã được làm sạch
    });

    if (profileError) throw profileError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Lỗi API:", error); // Log lỗi ra terminal để dễ xem
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
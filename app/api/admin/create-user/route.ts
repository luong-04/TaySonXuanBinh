import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return NextResponse.json({ error: "Thiếu cấu hình Key trên Vercel" }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body = await req.json();
    // Đồng bộ: CoachManager gửi full_name, ClubManager có thể gửi fullName
    const { email, password, full_name, role, ...otherData } = body;
    const finalFullName = full_name || body.fullName || "Người dùng mới";

    let userId = null;
    let profileId = null;

    // 1. Nếu có email/pass thì tạo Auth User
    if (email && password && password.trim() !== "") {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: finalFullName }
      });
      if (authError) throw authError;
      userId = authData.user.id;
      profileId = userId; 
    } else {
      profileId = crypto.randomUUID();
    }

    // 2. Chuẩn bị dữ liệu Profile (Làm sạch data)
    const profileData: any = { ...otherData };
    if (profileData.master_id === '') profileData.master_id = null;
    if (profileData.club_id === '') profileData.club_id = null;
    if (profileData.join_date === '') profileData.join_date = null;
    if (profileData.dob === '') profileData.dob = null;
    if (profileData.belt_level) profileData.belt_level = Number(profileData.belt_level);

    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: profileId,
      auth_id: userId,
      email: email || null,
      full_name: finalFullName,
      role: role || 'student',
      ...profileData
    });

    if (profileError) throw profileError;

    return NextResponse.json({ success: true, id: profileId });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
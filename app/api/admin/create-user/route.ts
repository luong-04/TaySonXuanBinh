import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // ✅ FIX LỖI Ở ĐÂY: Thêm 'source' vào để loại bỏ nó ra khỏi otherData
    const { email, password, fullName, role, source, ...otherData } = body;

    let userId = null; 
    let profileId = null;

    // 1. Tạo user Auth
    if (email && password) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true 
      });
      if (authError) throw authError;
      
      userId = authData.user.id;
      profileId = userId;
    } else {
      // Nếu là Võ sinh -> Tự tạo ID
      profileId = crypto.randomUUID();
    }

    // 2. Chuẩn bị dữ liệu Profile
    const profileData = { ...otherData };

    // --- FIX LỖI DỮ LIỆU RỖNG ---
    if (profileData.master_id === '') profileData.master_id = null;
    if (profileData.club_id === '') profileData.club_id = null;
    if (profileData.join_date === '') profileData.join_date = null;
    if (profileData.dob === '') profileData.dob = null;
    
    // Fix lỗi NaN cấp đai
    if (profileData.belt_level) {
        profileData.belt_level = Number(profileData.belt_level) || 0;
    }

    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: profileId,        
      auth_id: userId,      
      email: email || null, 
      full_name: fullName,
      role: role || 'student',
      ...profileData // Giờ trong này đã sạch, không còn chứa 'source' nữa
    });

    if (profileError) {
      if (userId) await supabaseAdmin.auth.admin.deleteUser(userId);
      throw profileError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
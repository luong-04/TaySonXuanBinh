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
    
    // Thêm 'source' vào để loại bỏ nó ra khỏi otherData
    const { email, password, fullName, role, source, ...otherData } = body;

    // --- LOGIC MỚI: KIỂM TRA TRÙNG LẶP ---
    // Chỉ báo lỗi nếu trùng HỌ TÊN + NGÀY SINH + CLB (nghĩa là trùng 100% người thật)
    // Cho phép trùng tên nếu khác ngày sinh hoặc khác CLB
    if (fullName) {
        let query = supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('full_name', fullName);

        // Nếu có ngày sinh, check thêm ngày sinh
        if (otherData.dob) {
            query = query.eq('dob', otherData.dob);
        }
        
        // Nếu có CLB, check thêm CLB
        if (otherData.club_id) {
            query = query.eq('club_id', otherData.club_id);
        }

        // Nếu là HLV (có email), check chặn trùng email (Auth lo), ở đây check trùng hồ sơ
        if (role !== 'student') {
             // Với HLV, kiểm tra thêm số điện thoại hoặc các định danh khác nếu cần
             // Hiện tại logic trên (Tên + DOB + CLB) là đủ mạnh để chặn spam click
        }

        const { data: existingUser } = await query.maybeSingle();

        if (existingUser) {
            throw new Error(`Đã tồn tại thành viên "${fullName}" với cùng ngày sinh tại đơn vị này. Vui lòng kiểm tra lại!`);
        }
    }
    // -------------------------------------

    let userId = null; 
    let profileId = null;

    // 1. Tạo user Auth (Nếu có email/pass - Dành cho HLV)
    if (email && password) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
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
    if (profileData.avatar_url === '') profileData.avatar_url = null; // Xử lý ảnh rỗng
    
    // Fix lỗi NaN cấp đai
    if (typeof profileData.belt_level !== 'undefined') {
        profileData.belt_level = Number(profileData.belt_level) || 0;
    }

    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: profileId,        
      auth_id: userId,      
      email: email || null, 
      full_name: fullName,
      role: role || 'student',
      ...profileData 
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
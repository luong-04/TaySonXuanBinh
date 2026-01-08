import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    // CHUYỂN VÀO TRONG HÀM ĐỂ TRÁNH LỖI 405 TRÊN VERCEL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return NextResponse.json({ error: "Server chưa cấu hình Key" }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body = await req.json();
    
    // ĐỒNG BỘ TÊN BIẾN VỚI FORM GỬI LÊN (Cực kỳ quan trọng)
    // Trong CoachManager bạn dùng 'full_name' nhưng ở đây bạn bóc tách 'fullName' -> Sẽ bị lỗi mất tên
    const { email, password, full_name, role, source, ...otherData } = body;
    
    // Nếu CoachManager gửi 'full_name' mà bạn dùng 'fullName' ở đây thì fullName sẽ bị undefined
    const finalFullName = full_name || body.fullName || "Không tên";

    // --- KIỂM TRA TRÙNG LẶP ---
    let query = supabaseAdmin.from('profiles').select('id').eq('full_name', finalFullName);
    if (otherData.dob) query = query.eq('dob', otherData.dob);
    if (otherData.club_id) query = query.eq('club_id', otherData.club_id);

    const { data: existingUser } = await query.maybeSingle();
    if (existingUser) {
        throw new Error(`Đã tồn tại thành viên "${finalFullName}" này.`);
    }

    let userId = null; 
    let profileId = null;

    // 1. Tạo user Auth
    if (email && password) {
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

    // 2. Chuẩn bị dữ liệu Profile
    const profileData = { ...otherData };
    if (profileData.master_id === '') profileData.master_id = null;
    if (profileData.club_id === '') profileData.club_id = null;
    if (profileData.join_date === '') profileData.join_date = null;
    if (profileData.dob === '') profileData.dob = null;
    
    if (typeof profileData.belt_level !== 'undefined') {
        profileData.belt_level = Number(profileData.belt_level) || 0;
    }

    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: profileId,        
      auth_id: userId,      
      email: email || null, 
      full_name: finalFullName,
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
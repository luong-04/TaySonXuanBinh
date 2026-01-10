import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return NextResponse.json({ success: false, error: "Lỗi Server: Thiếu Key." }, { status: 500 });
    }

    // Dùng Service Role để có quyền ghi đè (Võ sinh thường không có quyền update trực tiếp table profiles nếu chặn RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    const body = await req.json();
    const { id, full_name, bio, dob, avatar_url } = body;

    if (!id) return NextResponse.json({ success: false, error: "Thiếu ID" }, { status: 400 });

    // CHỈ CHO PHÉP UPDATE NHỮNG TRƯỜNG NÀY (AN TOÀN)
    const updateData: any = {};
    
    if (full_name) updateData.full_name = full_name;
    if (avatar_url) updateData.avatar_url = avatar_url;
    
    // Bio: Cho phép xóa trắng
    if (typeof bio !== 'undefined') updateData.bio = bio;
    
    // Ngày sinh: Cho phép xóa trắng
    if (typeof dob !== 'undefined') updateData.dob = dob === '' ? null : dob;

    // Tuyệt đối KHÔNG update: belt_level, role, club_id ở đây

    const { error } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
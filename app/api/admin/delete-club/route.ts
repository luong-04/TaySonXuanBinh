import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { id } = await req.json();

    // Lưu ý: Ràng buộc Database (Foreign Key) có thể ngăn việc xóa nếu CLB còn võ sinh.
    // Bạn nên chuyển võ sinh sang CLB khác hoặc để NULL trước khi xóa.
    const { error } = await supabaseAdmin
      .from('clubs')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
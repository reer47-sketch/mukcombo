import { createClient } from '@supabase/supabase-js'

// 서버사이드 전용 클라이언트
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

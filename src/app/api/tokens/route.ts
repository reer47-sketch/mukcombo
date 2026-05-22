import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/tokens — 현재 유저 잔액 조회
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ balance: 0 })

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return NextResponse.json({ balance: 0 })

  const { data } = await supabase
    .from('user_tokens')
    .select('balance')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json({ balance: data?.balance ?? 0 })
}

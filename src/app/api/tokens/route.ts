import { NextRequest, NextResponse } from 'next/server'
import { supabase, createServiceClient } from '@/lib/supabase'

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

// POST /api/tokens — 어드민 전용 무료 지급 (테스트용)
// body: { amount: number, targetUserId?: string }
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean)
  if (!user.email || !adminEmails.includes(user.email)) {
    return NextResponse.json({ error: 'admin only' }, { status: 403 })
  }

  const { amount, targetUserId } = await req.json()
  if (!amount || amount < 1) return NextResponse.json({ error: 'invalid amount' }, { status: 400 })

  const userId = targetUserId || user.id
  const db = createServiceClient()

  const { data: existing } = await db
    .from('user_tokens')
    .select('balance')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    await db.from('user_tokens')
      .update({ balance: existing.balance + amount, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
  } else {
    await db.from('user_tokens').insert({ user_id: userId, balance: amount })
  }

  const { data: updated } = await db.from('user_tokens').select('balance').eq('user_id', userId).single()
  return NextResponse.json({ success: true, balance: updated?.balance ?? amount })
}

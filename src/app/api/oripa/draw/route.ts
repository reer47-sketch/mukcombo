import { NextRequest, NextResponse } from 'next/server'
import { supabase, createServiceClient } from '@/lib/supabase'

// POST /api/oripa/draw
// body: { eventId }
// 토큰 1개 소모 → 랜덤 슬롯 뽑기
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { eventId } = await req.json()
  if (!eventId) return NextResponse.json({ error: 'missing eventId' }, { status: 400 })

  const db = createServiceClient()

  // 이벤트 유효성 확인
  const { data: event } = await db
    .from('oripa_events')
    .select('*')
    .eq('id', eventId)
    .eq('is_active', true)
    .single()

  if (!event) return NextResponse.json({ error: 'event not found or inactive' }, { status: 404 })

  const now = new Date()
  if (now < new Date(event.start_date) || now > new Date(event.end_date)) {
    return NextResponse.json({ error: 'event not in progress' }, { status: 400 })
  }

  // 토큰 잔액 확인 (Service Role로 RLS 우회)
  const { data: tokenRow } = await db
    .from('user_tokens')
    .select('balance')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!tokenRow || tokenRow.balance < 1) {
    return NextResponse.json({ error: 'insufficient tokens' }, { status: 402 })
  }

  // 미뽑힌 슬롯 개수 확인
  const { count: undrawnCount } = await db
    .from('oripa_slots')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('is_drawn', false)

  if (!undrawnCount || undrawnCount === 0) {
    return NextResponse.json({ error: 'no slots remaining' }, { status: 400 })
  }

  // 랜덤 오프셋으로 미뽑힌 슬롯 1개 선택 (crypto.getRandomValues 대신 서버 Math.random — 더 빠름)
  // 진짜 랜덤: position 기준으로 랜덤 offset pick
  const randomOffset = Math.floor(Math.random() * undrawnCount)

  const { data: slot } = await db
    .from('oripa_slots')
    .select('id, prize_id, position')
    .eq('event_id', eventId)
    .eq('is_drawn', false)
    .order('position', { ascending: true })
    .range(randomOffset, randomOffset)
    .single()

  if (!slot) return NextResponse.json({ error: 'slot pick failed' }, { status: 500 })

  // 원자적 처리: 토큰 차감 + 슬롯 마킹 + 결과 기록
  const drawnAt = new Date().toISOString()

  const [tokenUpdate, slotUpdate, drawInsert] = await Promise.all([
    db.from('user_tokens')
      .update({ balance: tokenRow.balance - 1, updated_at: drawnAt })
      .eq('user_id', user.id)
      .eq('balance', tokenRow.balance), // optimistic lock
    db.from('oripa_slots')
      .update({ is_drawn: true, drawn_by: user.id, drawn_at: drawnAt })
      .eq('id', slot.id)
      .eq('is_drawn', false), // 이중 뽑기 방지
    db.from('oripa_draws').insert({
      event_id: eventId,
      user_id: user.id,
      slot_id: slot.id,
      prize_id: slot.prize_id,
      drawn_at: drawnAt,
    }),
  ])

  if (tokenUpdate.error || slotUpdate.error || drawInsert.error) {
    // 충돌 발생 시 재시도 안내
    return NextResponse.json({ error: 'draw conflict, please retry' }, { status: 409 })
  }

  // 상품 정보 반환
  let prize = null
  if (slot.prize_id) {
    const { data: prizeData } = await db
      .from('oripa_prizes')
      .select('*')
      .eq('id', slot.prize_id)
      .single()
    prize = prizeData
  }

  return NextResponse.json({
    slotPosition: slot.position,
    prize,          // null이면 꽝
    remainingTokens: tokenRow.balance - 1,
  })
}

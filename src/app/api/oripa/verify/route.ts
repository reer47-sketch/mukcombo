import { NextRequest, NextResponse } from 'next/server'
import { createHash, createHmac } from 'crypto'
import { createServiceClient } from '@/lib/supabase'

// GET /api/oripa/verify?eventId=xxx
// 이벤트 시드 공개 후 공정성 검증 데이터 반환
export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get('eventId')
  if (!eventId) return NextResponse.json({ error: 'missing eventId' }, { status: 400 })

  const db = createServiceClient()

  const { data: event } = await db
    .from('oripa_events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (!event) return NextResponse.json({ error: 'event not found' }, { status: 404 })

  const result: Record<string, unknown> = {
    eventId: event.id,
    title: event.title,
    seedHash: event.seed_hash,
    totalSlots: event.total_slots,
    isEnded: new Date() > new Date(event.end_date),
  }

  // 시드가 공개된 경우 검증 정보 제공
  if (event.seed) {
    const computedHash = createHash('sha256').update(event.seed).digest('hex')
    const hashMatches = computedHash === event.seed_hash

    // 슬롯 배치 재현
    const { data: prizes } = await db
      .from('oripa_prizes')
      .select('*')
      .eq('event_id', eventId)
      .order('rank')

    const { data: draws } = await db
      .from('oripa_draws')
      .select('*, oripa_prizes(name, rank)')
      .eq('event_id', eventId)
      .order('drawn_at')

    // 슬롯 배치 재현 (셔플 알고리즘 동일하게, 꽝 없음)
    const sorted = [...(prizes || [])].sort((a, b) => b.rank - a.rank)
    const lastPrize = sorted[0]
    const slotPrizes: string[] = []
    for (const prize of (prizes || [])) {
      for (let i = 0; i < prize.quantity; i++) slotPrizes.push(prize.id as string)
    }
    while (slotPrizes.length < event.total_slots) slotPrizes.push(lastPrize.id as string)
    const shuffled = deterministicShuffle(slotPrizes, event.seed)

    result.seed = event.seed
    result.hashMatches = hashMatches
    result.verificationPassed = hashMatches
    result.slotArrangement = shuffled.map((prizeId, i) => ({
      position: i,
      prizeId,
      prizeName: prizes?.find(p => p.id === prizeId)?.name || '꽝',
    }))
    result.draws = draws
  }

  return NextResponse.json(result)
}

function deterministicShuffle<T>(arr: T[], seed: string): T[] {
  const result = [...arr]
  const n = result.length
  for (let i = n - 1; i > 0; i--) {
    const hmac = createHmac('sha256', seed).update(String(i)).digest('hex')
    const rand = parseInt(hmac.slice(0, 8), 16)
    const j = rand % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

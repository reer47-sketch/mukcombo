import { NextRequest, NextResponse } from 'next/server'
import { createHash, createHmac, randomBytes } from 'crypto'
import { supabase, createServiceClient } from '@/lib/supabase'

// ── 어드민 인증 헬퍼 ────────────────────────────────────────────
async function requireAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return null
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean)
  if (!user.email || !adminEmails.includes(user.email)) return null
  return user
}

// GET /api/oripa/events — 이벤트 목록 (누구나)
export async function GET() {
  const db = createServiceClient()
  const { data: events, error } = await db
    .from('oripa_events')
    .select(`
      *,
      oripa_prizes(*)
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 각 이벤트에 남은 슬롯 수 추가
  const enriched = await Promise.all((events || []).map(async ev => {
    const { count: remaining } = await db
      .from('oripa_slots')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', ev.id)
      .eq('is_drawn', false)
    return { ...ev, remaining_slots: remaining ?? 0 }
  }))

  return NextResponse.json(enriched)
}

// POST /api/oripa/events — 이벤트 생성 (어드민)
// body: { title, description, start_date, end_date, total_slots, prizes: [{ rank, name, description, images, quantity }] }
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const body = await req.json()
  const { title, description, start_date, end_date, total_slots, prizes } = body

  if (!title || !start_date || !end_date || !prizes?.length) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 })
  }

  const totalSlots = total_slots || 100

  // 공정성 보장: seed 생성 + hash 공개
  const seed = randomBytes(32).toString('hex')
  const seedHash = createHash('sha256').update(seed).digest('hex')

  const db = createServiceClient()

  // 이벤트 생성
  const { data: event, error: evErr } = await db
    .from('oripa_events')
    .insert({ title, description, start_date, end_date, total_slots: totalSlots, seed_hash: seedHash, seed, is_active: true })
    .select()
    .single()

  if (evErr || !event) return NextResponse.json({ error: evErr?.message }, { status: 500 })

  // 상품 생성
  const prizeRows = prizes.map((p: { rank: number; name: string; description?: string; images?: string[]; quantity: number }) => ({
    event_id: event.id,
    rank: p.rank,
    name: p.name,
    description: p.description || '',
    images: p.images || [],
    quantity: p.quantity,
  }))

  const { data: createdPrizes, error: prizeErr } = await db
    .from('oripa_prizes')
    .insert(prizeRows)
    .select()

  if (prizeErr) return NextResponse.json({ error: prizeErr.message }, { status: 500 })

  // 슬롯 생성: prize들을 quantity만큼 배열에 넣고, 나머지는 꽝(null)
  // 시드 기반 Fisher-Yates 셔플로 배치
  const slotPrizes: (string | null)[] = []
  for (const prize of createdPrizes!) {
    for (let i = 0; i < prize.quantity; i++) slotPrizes.push(prize.id as string)
  }
  while (slotPrizes.length < totalSlots) slotPrizes.push(null)

  // HMAC-SHA256 기반 결정론적 셔플 (seed로 재현 가능)
  const shuffled = deterministicShuffle(slotPrizes, seed)

  const slotRows = shuffled.map((prizeId, position) => ({
    event_id: event.id,
    position,
    prize_id: prizeId,
  }))

  // 100개씩 배치 insert
  for (let i = 0; i < slotRows.length; i += 100) {
    const { error: slotErr } = await db.from('oripa_slots').insert(slotRows.slice(i, i + 100))
    if (slotErr) return NextResponse.json({ error: slotErr.message }, { status: 500 })
  }

  return NextResponse.json({ ...event, prizes: createdPrizes, seed_hash: seedHash })
}

// PATCH /api/oripa/events — 이벤트 수정 (어드민)
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id, title, description, start_date, end_date, is_active, reveal_seed } = await req.json()
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

  const db = createServiceClient()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (title !== undefined) updates.title = title
  if (description !== undefined) updates.description = description
  if (start_date !== undefined) updates.start_date = start_date
  if (end_date !== undefined) updates.end_date = end_date
  if (is_active !== undefined) updates.is_active = is_active

  // 시드 공개 (이벤트 종료 후)
  if (reveal_seed) {
    const { data: ev } = await db.from('oripa_events').select('seed').eq('id', id).single()
    if (ev?.seed) updates.seed = ev.seed
  }

  const { data, error } = await db
    .from('oripa_events')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// ── 결정론적 Fisher-Yates 셔플 (seed 기반) ──────────────────────
function deterministicShuffle<T>(arr: T[], seed: string): T[] {
  const result = [...arr]
  const n = result.length
  for (let i = n - 1; i > 0; i--) {
    // HMAC-SHA256(seed, i) → 결정론적 난수
    const hmac = createHmac('sha256', seed).update(String(i)).digest('hex')
    const rand = parseInt(hmac.slice(0, 8), 16)
    const j = rand % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

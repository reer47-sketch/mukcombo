import { NextRequest, NextResponse } from 'next/server'
import { supabase, createServiceClient } from '@/lib/supabase'

const DEFAULT_PACKAGES = [
  { id: 'pack_1', tokens: 1, price: 1000, label: '1개', sort_order: 0 },
  { id: 'pack_5', tokens: 5, price: 4500, label: '5개', sort_order: 1 },
  { id: 'pack_10', tokens: 10, price: 8000, label: '10개', sort_order: 2 },
  { id: 'pack_30', tokens: 30, price: 20000, label: '30개', sort_order: 3 },
]

async function getPackages() {
  try {
    const db = createServiceClient()
    const { data } = await db.from('token_packages').select('*').eq('is_active', true).order('sort_order')
    return data?.length ? data : DEFAULT_PACKAGES
  } catch {
    return DEFAULT_PACKAGES
  }
}

// GET /api/payments/prepare → 패키지 목록
export async function GET() {
  const packages = await getPackages()
  return NextResponse.json(packages)
}

// POST /api/payments/prepare — 결제 준비
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { packageId } = await req.json()
  const packages = await getPackages()
  const pkg = packages.find(p => p.id === packageId)
  if (!pkg) return NextResponse.json({ error: 'invalid package' }, { status: 400 })

  const orderId = `mukcombo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const db = createServiceClient()

  const { error } = await db.from('token_purchases').insert({
    user_id: user.id,
    token_amount: pkg.tokens,
    price_krw: pkg.price,
    toss_order_id: orderId,
    status: 'pending',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ orderId, amount: pkg.price, tokens: pkg.tokens, packageId })
}

// PATCH /api/payments/prepare — 어드민 전용 패키지 가격 수정
export async function PATCH(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean)
  if (!user.email || !adminEmails.includes(user.email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const packages = await req.json() as { id: string; tokens: number; price: number; label: string; sort_order: number }[]
  const db = createServiceClient()

  for (const pkg of packages) {
    await db.from('token_packages').upsert({
      id: pkg.id, tokens: pkg.tokens, price: pkg.price,
      label: pkg.label, sort_order: pkg.sort_order, is_active: true,
    })
  }

  return NextResponse.json({ success: true })
}

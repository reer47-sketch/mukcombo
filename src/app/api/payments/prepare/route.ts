import { NextRequest, NextResponse } from 'next/server'
import { supabase, createServiceClient } from '@/lib/supabase'

// 토큰 패키지 정의 (어드민이 env로도 제어 가능)
export const TOKEN_PACKAGES = [
  { id: 'pack_1', tokens: 1, price: 1000, label: '1개' },
  { id: 'pack_5', tokens: 5, price: 4500, label: '5개' },
  { id: 'pack_10', tokens: 10, price: 8000, label: '10개' },
  { id: 'pack_30', tokens: 30, price: 20000, label: '30개' },
]

// POST /api/payments/prepare
// body: { packageId: string }
// → { orderId, amount, tokens }
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { packageId } = await req.json()
  const pkg = TOKEN_PACKAGES.find(p => p.id === packageId)
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

// GET /api/payments/prepare → 패키지 목록
export async function GET() {
  return NextResponse.json(TOKEN_PACKAGES)
}

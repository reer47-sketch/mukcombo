import { NextRequest, NextResponse } from 'next/server'
import { supabase, createServiceClient } from '@/lib/supabase'

// POST /api/payments/confirm
// body: { paymentKey, orderId, amount }
// Toss Payments 결제 승인 후 토큰 지급
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { paymentKey, orderId, amount } = await req.json()
  if (!paymentKey || !orderId || !amount) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 })
  }

  const db = createServiceClient()

  // DB에서 pending 주문 확인
  const { data: purchase, error: purchaseErr } = await db
    .from('token_purchases')
    .select('*')
    .eq('toss_order_id', orderId)
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .single()

  if (purchaseErr || !purchase) {
    return NextResponse.json({ error: 'order not found' }, { status: 404 })
  }

  if (purchase.price_krw !== amount) {
    return NextResponse.json({ error: 'amount mismatch' }, { status: 400 })
  }

  // Toss Payments 승인 API 호출
  const tossSecretKey = process.env.TOSS_SECRET_KEY || ''
  const encoded = Buffer.from(`${tossSecretKey}:`).toString('base64')

  const tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${encoded}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  })

  if (!tossRes.ok) {
    const errBody = await tossRes.json()
    await db.from('token_purchases').update({ status: 'failed' }).eq('toss_order_id', orderId)
    return NextResponse.json({ error: errBody.message || 'toss confirm failed' }, { status: 400 })
  }

  // 결제 성공 → token_purchases 업데이트 + user_tokens 잔액 추가
  await db
    .from('token_purchases')
    .update({ status: 'confirmed', toss_payment_key: paymentKey })
    .eq('toss_order_id', orderId)

  // user_tokens upsert (없으면 생성, 있으면 balance 증가)
  const { data: existing } = await db
    .from('user_tokens')
    .select('balance')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    await db
      .from('user_tokens')
      .update({ balance: existing.balance + purchase.token_amount, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
  } else {
    await db
      .from('user_tokens')
      .insert({ user_id: user.id, balance: purchase.token_amount })
  }

  return NextResponse.json({ success: true, tokensAdded: purchase.token_amount })
}

import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/owner?user_id=xxx — 점주의 가게 목록
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id')
  if (!userId) return NextResponse.json([])

  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('owner_id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

// POST /api/owner/claim — 점주가 가게 소유권 연결
export async function POST(req: NextRequest) {
  const { userId, storeId } = await req.json()
  if (!userId || !storeId) return NextResponse.json({ error: '필수값 누락' }, { status: 400 })

  // 이미 owner가 있는 가게인지 확인
  const { data: store } = await supabase
    .from('stores').select('owner_id, name').eq('id', storeId).single()
  if (!store) return NextResponse.json({ error: '가게를 찾을 수 없어요' }, { status: 404 })
  if (store.owner_id && store.owner_id !== userId) {
    return NextResponse.json({ error: '이미 다른 점주가 등록된 가게예요' }, { status: 403 })
  }

  const { error } = await supabase
    .from('stores').update({ owner_id: userId }).eq('id', storeId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, storeName: store.name })
}

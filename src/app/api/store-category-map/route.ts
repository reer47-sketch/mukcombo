import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/store-category-map?store_id=xxx
export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get('store_id')
  if (!storeId) return NextResponse.json([])
  const { data, error } = await supabase
    .from('store_category_map')
    .select('*, food_categories(id, name_ko, name_en)')
    .eq('store_id', storeId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — 가게 카테고리 ↔ 범용 카테고리 연결 저장
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { storeId, mappings } = body
  // 기존 삭제 후 재등록
  await supabase.from('store_category_map').delete().eq('store_id', storeId)
  if (!mappings || mappings.length === 0) return NextResponse.json({ success: true })
  const { error } = await supabase.from('store_category_map').insert(
    mappings.map((m: { storeCategory: string; foodCategoryId: string }) => ({
      store_id: storeId,
      store_category: m.storeCategory,
      food_category_id: m.foodCategoryId,
    }))
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

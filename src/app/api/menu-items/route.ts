import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/menu-items?store_id=xxx  — 가게별 메뉴 아이템 조회
// GET /api/menu-items?categories=ramen,beer  — 범용 카테고리로 가게 검색
export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get('store_id')
  const categories = req.nextUrl.searchParams.get('categories')

  // 범용 카테고리로 가게 검색
  if (categories) {
    const catIds = categories.split(',').filter(Boolean)
    if (catIds.length === 0) return NextResponse.json([])

    // 각 카테고리별로 해당 메뉴를 가진 store_id 목록 수집
    const storeIdSets: Set<string>[] = []
    for (const catId of catIds) {
      const { data } = await supabase
        .from('menu_items')
        .select('store_id')
        .eq('food_category_id', catId)
      const ids = new Set((data || []).map((d: { store_id: string }) => d.store_id))
      storeIdSets.push(ids)
    }

    // 모든 카테고리를 가진 가게만 (교집합)
    const intersection = Array.from(storeIdSets[0]).filter(id =>
      storeIdSets.every(set => set.has(id))
    )

    if (intersection.length === 0) return NextResponse.json([])

    // 가게 정보 + 해당 카테고리 메뉴들 가져오기
    const results = []
    for (const storeId of intersection) {
      const { data: store } = await supabase
        .from('stores')
        .select('id, name, name_en, emoji, address, address_en, map_url')
        .eq('id', storeId)
        .single()
      if (!store) continue

      // 검색된 카테고리에 해당하는 메뉴들
      const { data: menus } = await supabase
        .from('menu_items')
        .select('*, food_categories(id, name_ko, name_en, emoji)')
        .eq('store_id', storeId)
        .in('food_category_id', catIds)

      results.push({ store, menus: menus || [] })
    }
    return NextResponse.json(results)
  }

  // 가게별 메뉴 조회
  if (storeId) {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*, food_categories(id, name_ko, name_en, emoji)')
      .eq('store_id', storeId)
      .order('food_category_id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  return NextResponse.json([])
}

// POST /api/menu-items — 메뉴 아이템 등록
export async function POST(req: NextRequest) {
  const body = await req.json()

  // 배열로 여러 개 한번에 등록 가능
  const items = Array.isArray(body) ? body : [body]
  const { data, error } = await supabase
    .from('menu_items')
    .upsert(items.map(item => ({
      store_id: item.storeId,
      name_ko: item.nameKo,
      name_en: item.nameEn || '',
      price: item.price || '',
      food_category_id: item.foodCategoryId || null,
    })))
    .select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/menu-items?store_id=xxx — 가게 메뉴 전체 삭제 후 재등록용
export async function DELETE(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get('store_id')
  if (!storeId) return NextResponse.json({ error: 'store_id required' }, { status: 400 })
  const { error } = await supabase.from('menu_items').delete().eq('store_id', storeId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

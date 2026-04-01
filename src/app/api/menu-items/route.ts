import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/menu-items?categories=ramen,beer
// 범용 카테고리로 가게+메뉴 검색
export async function GET(req: NextRequest) {
  const categories = req.nextUrl.searchParams.get('categories')
  if (!categories) return NextResponse.json([])

  const catIds = categories.split(',').filter(Boolean)

  // 각 범용 카테고리를 가진 가게 카테고리 맵 조회
  const { data: maps } = await supabase
    .from('store_category_map')
    .select('store_id, store_category, food_category_id')
    .in('food_category_id', catIds)

  if (!maps || maps.length === 0) return NextResponse.json([])

  // store_id별로 어떤 범용 카테고리를 갖고 있는지 집계
  const storeMap: Record<string, { cats: Set<string>; storeCats: Record<string, string[]> }> = {}
  maps.forEach((m: { store_id: string; store_category: string; food_category_id: string }) => {
    if (!storeMap[m.store_id]) storeMap[m.store_id] = { cats: new Set(), storeCats: {} }
    storeMap[m.store_id].cats.add(m.food_category_id)
    if (!storeMap[m.store_id].storeCats[m.food_category_id]) {
      storeMap[m.store_id].storeCats[m.food_category_id] = []
    }
    storeMap[m.store_id].storeCats[m.food_category_id].push(m.store_category)
  })

  // 모든 검색 카테고리를 갖춘 가게만 필터
  const matchingStoreIds = Object.entries(storeMap)
    .filter(([, v]) => catIds.every(cid => v.cats.has(cid)))
    .map(([id]) => id)

  if (matchingStoreIds.length === 0) return NextResponse.json([])

  // 가게 정보 조회
  const { data: stores } = await supabase
    .from('stores')
    .select('id, name, name_en, emoji, address, address_en, map_url, categories, prices, menu_names')
    .in('id', matchingStoreIds)

  if (!stores) return NextResponse.json([])

  // 결과 조립 — 가게별로 검색된 카테고리의 메뉴들 포함
  const results = stores.map(store => {
    const storeInfo = storeMap[store.id]
    const matchedMenus: { foodCategoryId: string; storeCategory: string; menus: { nameKo: string; nameEn: string; price: string }[] }[] = []

    catIds.forEach(catId => {
      const storeCatNames = storeInfo.storeCats[catId] || []
      storeCatNames.forEach(storeCatName => {
        const menuNames: string[] = store.categories?.[storeCatName] || []
        const menus = menuNames.map(nameKo => ({
          nameKo,
          nameEn: store.menu_names?.[nameKo]?.en || '',
          price: store.prices?.[nameKo] || '',
        }))
        if (menus.length > 0) {
          matchedMenus.push({ foodCategoryId: catId, storeCategory: storeCatName, menus })
        }
      })
    })

    return { store, matchedMenus }
  })

  return NextResponse.json(results)
}

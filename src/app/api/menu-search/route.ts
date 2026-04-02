import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/menu-search?q=라멘
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json([])

  // stores 전체 가져와서 JS에서 메뉴명 검색
  const { data: stores, error } = await supabase
    .from('stores')
    .select('id, name, name_en, emoji, address, address_en, map_url, categories, menu_names, prices')

  if (error || !stores) return NextResponse.json([])

  const results: {
    store: { id: string; name: string; name_en: string; emoji: string; address: string; address_en: string; map_url: string }
    matchedMenus: { nameKo: string; nameEn: string; price: string; category: string }[]
  }[] = []

  stores.forEach(store => {
    const matchedMenus: { nameKo: string; nameEn: string; price: string; category: string }[] = []
    const menuNames = store.menu_names || {}
    const prices = store.prices || {}
    const categories = store.categories || {}

    // 각 메뉴명에서 검색어 포함 여부 확인
    Object.entries(menuNames).forEach(([nameKo, nameObj]: [string, any]) => {
      const ko = nameObj?.ko || nameKo
      const en = nameObj?.en || ''
      // 한국어 또는 영어 메뉴명에 검색어 포함 여부
      if (
        ko.toLowerCase().includes(q.toLowerCase()) ||
        en.toLowerCase().includes(q.toLowerCase())
      ) {
        // 이 메뉴가 속한 카테고리 찾기
        let category = ''
        Object.entries(categories).forEach(([catName, menuList]: [string, any]) => {
          if (Array.isArray(menuList) && menuList.includes(nameKo)) {
            category = catName
          }
        })
        matchedMenus.push({ nameKo: ko, nameEn: en, price: prices[nameKo] || '', category })
      }
    })

    if (matchedMenus.length > 0) {
      results.push({
        store: {
          id: store.id, name: store.name, name_en: store.name_en,
          emoji: store.emoji, address: store.address, address_en: store.address_en,
          map_url: store.map_url,
        },
        matchedMenus,
      })
    }
  })

  return NextResponse.json(results)
}

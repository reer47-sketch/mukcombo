import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/menu-search?q=라멘
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('q')?.trim()
  if (!raw || raw.length < 2) return NextResponse.json([])

  // 입력 길이 제한 + LIKE 특수문자 이스케이프
  const q = raw.slice(0, 50).replace(/%/g, '\\%').replace(/_/g, '\\_')
  const qLower = q.toLowerCase()

  const { data: stores, error } = await supabase
    .from('stores')
    .select('id, name, name_en, emoji, address, address_en, map_url, categories, menu_names, prices')
    .limit(200)

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

    // DB 필터 이후 JS에서 정확한 메뉴명 매칭
    Object.entries(menuNames).forEach(([nameKo, nameObj]: [string, any]) => {
      const ko = nameObj?.ko || nameKo
      const en = nameObj?.en || ''
      if (
        ko.toLowerCase().includes(qLower) ||
        en.toLowerCase().includes(qLower)
      ) {
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

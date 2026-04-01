'use client'
import { useEffect, useState } from 'react'

interface FoodCategory {
  id: string
  name_ko: string
  name_en: string
  emoji: string
}

interface MenuItem {
  id: string
  name_ko: string
  name_en: string
  price: string
  food_category_id: string
  food_categories: FoodCategory
}

interface SearchResult {
  store: {
    id: string
    name: string
    name_en: string
    emoji: string
    address: string
    address_en: string
    map_url: string
  }
  menus: MenuItem[]
}

interface Props {
  lang: 'ko' | 'en'
  F: React.CSSProperties
}

export default function FoodSearch({ lang, F }: Props) {
  const [categories, setCategories] = useState<FoodCategory[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [results, setResults] = useState<SearchResult[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/food-categories')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setCategories(data) })
  }, [])

  const toggleCat = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
    setSearched(false)
  }

  const handleSearch = async () => {
    if (selected.length === 0) return
    setLoading(true)
    setSearched(true)
    const res = await fetch(`/api/menu-items?categories=${selected.join(',')}`)
    const data = await res.json()
    setResults(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  const handleReset = () => {
    setSelected([])
    setResults([])
    setSearched(false)
  }

  const storeName = (s: SearchResult['store']) => lang === 'en' ? s.name_en || s.name : s.name
  const storeAddr = (s: SearchResult['store']) => lang === 'en' ? s.address_en || s.address : s.address
  const catName = (c: FoodCategory) => lang === 'en' ? c.name_en : c.name_ko
  const menuName = (m: MenuItem) => lang === 'en' ? m.name_en || m.name_ko : m.name_ko

  return (
    <div style={{ paddingBottom: 60 }}>

      {/* 검색 헤더 */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#f0ece4', marginBottom: 4, ...F }}>
          {lang === 'ko' ? '먹고 싶은 조합을 선택하세요' : 'Select what you want to eat'}
        </div>
        <div style={{ fontSize: 11, color: '#555', marginBottom: 16, ...F }}>
          {lang === 'ko' ? '카테고리를 2개 이상 선택하면 해당 조합을 파는 식당을 찾아드려요' : 'Select 2+ categories to find restaurants with that combo'}
        </div>

        {/* 카테고리 그리드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
          {categories.map(cat => {
            const sel = selected.includes(cat.id)
            return (
              <button key={cat.id} onClick={() => toggleCat(cat.id)} style={{
                background: sel ? '#1a2a1a' : '#0d0d0d',
                border: `1.5px solid ${sel ? '#6fcf97' : '#1e1e1e'}`,
                borderRadius: 12,
                padding: '10px 6px',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                transition: 'all 0.15s',
              }}>
                <span style={{ fontSize: 22 }}>{cat.emoji}</span>
                <span style={{ fontSize: 10, fontWeight: sel ? 700 : 400, color: sel ? '#6fcf97' : '#888', textAlign: 'center', lineHeight: 1.3, ...F }}>
                  {catName(cat).split('/')[0]}
                </span>
                {sel && <span style={{ fontSize: 8, color: '#6fcf97' }}>✓</span>}
              </button>
            )
          })}
        </div>

        {/* 선택된 조합 미리보기 */}
        {selected.length > 0 && (
          <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: '#c8a96e', fontWeight: 700, letterSpacing: 1, marginBottom: 8, ...F }}>
              {lang === 'ko' ? '선택한 조합' : 'Selected Combo'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              {selected.map((id, idx) => {
                const cat = categories.find(c => c.id === id)
                if (!cat) return null
                return (
                  <span key={id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {idx > 0 && <span style={{ color: '#c8a96e', fontSize: 14, fontWeight: 700 }}>+</span>}
                    <span style={{ background: '#141414', border: '1px solid #6fcf97', borderRadius: 20, padding: '4px 10px', fontSize: 12, color: '#6fcf97', cursor: 'pointer', ...F }}
                      onClick={() => toggleCat(id)}>
                      {cat.emoji} {catName(cat)} ✕
                    </span>
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* 검색 버튼 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button onClick={handleSearch} disabled={selected.length === 0 || loading}
            style={{ flex: 1, padding: '12px', background: selected.length === 0 ? '#161616' : '#c8a96e', color: selected.length === 0 ? '#383838' : '#080808', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: selected.length === 0 ? 'not-allowed' : 'pointer', ...F }}>
            {loading ? (lang === 'ko' ? '검색 중...' : 'Searching...') : `🔍 ${lang === 'ko' ? '식당 찾기' : 'Find Restaurants'}`}
          </button>
          {(selected.length > 0 || searched) && (
            <button onClick={handleReset} style={{ padding: '12px 16px', background: '#141414', border: '1px solid #222', color: '#888', borderRadius: 10, fontSize: 13, cursor: 'pointer', ...F }}>
              {lang === 'ko' ? '초기화' : 'Reset'}
            </button>
          )}
        </div>
      </div>

      {/* 검색 결과 */}
      {searched && !loading && (
        <div style={{ padding: '0 20px' }}>
          {results.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>😢</div>
              <div style={{ fontSize: 14, color: '#555', ...F }}>
                {lang === 'ko'
                  ? '해당 조합을 파는 식당이 없어요\n다른 조합으로 검색해보세요!'
                  : 'No restaurants found with this combo.\nTry a different combination!'}
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 11, color: '#555', letterSpacing: 2, fontWeight: 700, marginBottom: 14, ...F }}>
                {lang === 'ko' ? `검색 결과 ${results.length}곳` : `${results.length} restaurant${results.length !== 1 ? 's' : ''} found`}
              </div>
              {results.map(({ store, menus }) => (
                <div key={store.id} style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 14, padding: '16px', marginBottom: 12 }}>
                  {/* 가게 정보 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <div style={{ fontSize: 32 }}>{store.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 3, ...F }}>{storeName(store)}</div>
                      <a href={store.map_url} target="_blank" rel="noreferrer"
                        style={{ fontSize: 11, color: '#c8a96e', textDecoration: 'none' }}>
                        📍 {storeAddr(store)}
                      </a>
                    </div>
                  </div>

                  {/* 해당 카테고리 메뉴들 */}
                  <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: 12 }}>
                    <div style={{ fontSize: 10, color: '#888', fontWeight: 700, letterSpacing: 1, marginBottom: 10, ...F }}>
                      {lang === 'ko' ? '해당 메뉴' : 'Matching Menus'}
                    </div>
                    {/* 카테고리별로 그룹핑 */}
                    {selected.map(catId => {
                      const cat = categories.find(c => c.id === catId)
                      const catMenus = menus.filter(m => m.food_category_id === catId)
                      if (!cat || catMenus.length === 0) return null
                      return (
                        <div key={catId} style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 11, color: '#666', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4, ...F }}>
                            <span>{cat.emoji}</span>
                            <span>{catName(cat)}</span>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {catMenus.map(menu => (
                              <div key={menu.id} style={{ background: '#141414', border: '1px solid #282828', borderRadius: 8, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: '#f0ece4', ...F }}>{menuName(menu)}</span>
                                {menu.price && <span style={{ fontSize: 11, color: '#c8a96e' }}>{menu.price}원</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* 초기 상태 안내 */}
      {!searched && selected.length === 0 && (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 13, color: '#555', lineHeight: 1.8, ...F }}>
            {lang === 'ko'
              ? '위에서 먹고 싶은 카테고리를\n선택하고 식당을 찾아보세요!'
              : 'Select food categories above\nto find matching restaurants!'}
          </div>
          <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
            {[['🍜 라멘', '🍺 맥주'], ['🍗 치킨', '🥤 음료'], ['🍚 밥', '🍗 튀김']].map((combo, i) => (
              <span key={i} style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 16, padding: '5px 12px', fontSize: 11, color: '#666', ...F }}>
                {combo.join(' + ')}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

'use client'
import { useEffect, useState, useRef } from 'react'
import ChatBot from '@/components/ChatBot'

interface FoodCategory { id: string; name_ko: string; name_en: string; group_ko: string; group_en: string; group_emoji: string }
interface NaverTrendItem { keyword: string; score: number }
interface GoogleTrendItem { keyword: string; traffic?: string }
interface YoutubeTrendItem { title: string; videoId: string; thumbnail: string; channelTitle: string }
interface DailyTrends { naver: NaverTrendItem[]; google: GoogleTrendItem[]; youtube: YoutubeTrendItem[]; fetchedAt?: string }
interface MatchedMenu { foodCategoryId: string; storeCategory: string; menus: { nameKo: string; nameEn: string; price: string }[] }
interface SearchResult {
  store: { id: string; name: string; name_en: string; emoji: string; address: string; address_en: string; map_url: string }
  matchedMenus: MatchedMenu[]
}
interface MenuSearchResult {
  store: { id: string; name: string; name_en: string; emoji: string; address: string; address_en: string; map_url: string }
  matchedMenus: { nameKo: string; nameEn: string; price: string; category: string }[]
}

interface Props { lang: 'ko' | 'en'; F: React.CSSProperties }

export default function FoodSearch({ lang, F }: Props) {
  const [mode, setMode] = useState<'chat' | 'search'>('chat')

  // ── 오늘의 트렌드 ────────────────────────────────────────────
  const [trends, setTrends] = useState<DailyTrends | null>(null)
  const [trendsLoading, setTrendsLoading] = useState(true)
  const [trendsTab, setTrendsTab] = useState<'naver' | 'google' | 'youtube'>('naver')

  useEffect(() => {
    fetch('/api/trends').then(r => r.json()).then(d => {
      if (d && !d.error) setTrends(d)
      setTrendsLoading(false)
    }).catch(() => setTrendsLoading(false))
  }, [])

  // 범용 카테고리 검색
  const [categories, setCategories] = useState<FoodCategory[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [results, setResults] = useState<SearchResult[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)

  // 메뉴명 검색
  const [menuQuery, setMenuQuery] = useState('')
  const [menuResults, setMenuResults] = useState<MenuSearchResult[]>([])
  const [menuSearched, setMenuSearched] = useState(false)
  const [menuLoading, setMenuLoading] = useState(false)
  const [menuError, setMenuError] = useState('')
  const searchTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetch('/api/food-categories').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setCategories(data)
    })
  }, [])

  // 메뉴명 검색 — 입력 후 500ms 디바운스
  const handleMenuInput = (val: string) => {
    setMenuQuery(val)
    setMenuError('')
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (val.trim().length === 0) { setMenuResults([]); setMenuSearched(false); return }
    if (val.trim().length < 2) { setMenuError(lang === 'ko' ? '2글자 이상 입력해주세요' : 'Enter at least 2 characters'); return }
    searchTimer.current = setTimeout(async () => {
      setMenuLoading(true); setMenuSearched(true)
      const res = await fetch(`/api/menu-search?q=${encodeURIComponent(val.trim())}`)
      const data = await res.json()
      setMenuResults(Array.isArray(data) ? data : [])
      setMenuLoading(false)
    }, 500)
  }

  const toggleCat = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
    setSearched(false)
  }

  const handleSearch = async () => {
    if (selected.length === 0) return
    setLoading(true); setSearched(true)
    const res = await fetch(`/api/menu-items?categories=${selected.join(',')}`)
    const data = await res.json()
    setResults(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  const handleReset = () => { setSelected([]); setResults([]); setSearched(false) }
  const storeName = (s: { name: string; name_en: string }) => lang === 'en' ? s.name_en || s.name : s.name
  const storeAddr = (s: { address: string; address_en: string }) => lang === 'en' ? s.address_en || s.address : s.address
  const catName = (c: FoodCategory) => lang === 'en' ? c.name_en : c.name_ko
  const menuName = (m: { nameKo: string; nameEn: string }) => lang === 'en' ? m.nameEn || m.nameKo : m.nameKo

  // 검색어 하이라이트
  const highlight = (text: string, query: string) => {
    if (!query || query.length < 2) return <span>{text}</span>
    const idx = text.toLowerCase().indexOf(query.toLowerCase())
    if (idx === -1) return <span>{text}</span>
    return (
      <span>
        {text.slice(0, idx)}
        <span style={{ background: '#c8a96e33', color: '#c8a96e', fontWeight: 700 }}>{text.slice(idx, idx + query.length)}</span>
        {text.slice(idx + query.length)}
      </span>
    )
  }

  return (
    <div style={{ paddingBottom: 60 }}>

      {/* ── 모드 토글 ── */}
      <div style={{ display: 'flex', background: '#0d0d0d', borderBottom: '1px solid #161616', padding: '10px 20px', gap: 6 }}>
        <button onClick={() => setMode('chat')} style={{
          flex: 1, padding: '8px', background: mode === 'chat' ? '#c8a96e' : '#141414',
          color: mode === 'chat' ? '#080808' : '#666', border: 'none', borderRadius: 8,
          fontSize: 13, fontWeight: 700, cursor: 'pointer', ...F,
        }}>🤖 AI 추천</button>
        <button onClick={() => setMode('search')} style={{
          flex: 1, padding: '8px', background: mode === 'search' ? '#c8a96e' : '#141414',
          color: mode === 'search' ? '#080808' : '#666', border: 'none', borderRadius: 8,
          fontSize: 13, fontWeight: 700, cursor: 'pointer', ...F,
        }}>🔍 직접 검색</button>
      </div>

      {/* ── 오늘의 트렌드 ── */}
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 16 }}>🔥</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#f0ece4', ...F }}>
            {lang === 'ko' ? '오늘의 트렌드' : "Today's Trends"}
          </span>
          <span style={{ fontSize: 10, color: '#444', marginLeft: 'auto', ...F }}>
            {trends?.fetchedAt ? new Date(trends.fetchedAt).toLocaleDateString('ko', { month: 'numeric', day: 'numeric' }) : ''}
          </span>
        </div>

        {/* 탭 */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
          {(['naver', 'google', 'youtube'] as const).map(tab => {
            const labels = { naver: '네이버', google: '구글', youtube: '유튜브' }
            const active = trendsTab === tab
            return (
              <button key={tab} onClick={() => setTrendsTab(tab)} style={{
                padding: '5px 12px', fontSize: 11, fontWeight: active ? 700 : 400, cursor: 'pointer',
                background: active ? '#c8a96e22' : 'transparent',
                border: `1px solid ${active ? '#c8a96e' : '#222'}`,
                borderRadius: 20, color: active ? '#c8a96e' : '#555', ...F,
              }}>{labels[tab]}</button>
            )
          })}
        </div>

        {/* 탭 콘텐츠 */}
        <div style={{ minHeight: 60, marginBottom: 16 }}>
          {trendsLoading ? (
            <div style={{ color: '#444', fontSize: 12, paddingTop: 8, ...F }}>불러오는 중...</div>
          ) : trendsTab === 'naver' ? (
            <div>
              {!trends?.naver?.length ? (
                <div style={{ fontSize: 11, color: '#444', ...F }}>
                  {lang === 'ko' ? 'NAVER_CLIENT_ID / SECRET을 .env.local에 설정해주세요' : 'Set NAVER_CLIENT_ID / SECRET in .env.local'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {trends.naver.map((item, i) => (
                    <div key={item.keyword} style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      background: '#0d0d0d', border: '1px solid #1e1e1e',
                      borderRadius: 20, padding: '5px 10px',
                    }}>
                      <span style={{ fontSize: 10, color: i < 3 ? '#c8a96e' : '#444', fontWeight: 700, minWidth: 16 }}>{i + 1}</span>
                      <span style={{ fontSize: 13, color: '#f0ece4', ...F }}>{item.keyword}</span>
                      {item.score > 1.2 && (
                        <span style={{ fontSize: 9, color: '#e05a5a', fontWeight: 700 }}>↑</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : trendsTab === 'google' ? (
            <div>
              {!trends?.google?.length ? (
                <div style={{ fontSize: 11, color: '#444', ...F }}>구글 트렌드 데이터를 가져올 수 없어요</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {trends.google.map((item, i) => (
                    <div key={item.keyword} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, color: i < 3 ? '#c8a96e' : '#444', fontWeight: 700, minWidth: 18 }}>{i + 1}</span>
                      <span style={{ fontSize: 13, color: '#f0ece4', flex: 1, ...F }}>{item.keyword}</span>
                      {item.traffic && <span style={{ fontSize: 10, color: '#555', ...F }}>{item.traffic}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              {!trends?.youtube?.length ? (
                <div style={{ fontSize: 11, color: '#444', lineHeight: 1.6, ...F }}>
                  {lang === 'ko' ? 'YOUTUBE_API_KEY를 .env.local에 설정하면 활성화됩니다' : 'Set YOUTUBE_API_KEY in .env.local to enable'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {trends.youtube.slice(0, 6).map((item) => (
                    <a key={item.videoId} href={`https://www.youtube.com/watch?v=${item.videoId}`}
                      target="_blank" rel="noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                      {item.thumbnail && (
                        <img src={item.thumbnail} alt="" style={{ width: 56, height: 42, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: '#f0ece4', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', ...F }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: 10, color: '#555', marginTop: 2, ...F }}>{item.channelTitle}</div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ height: 1, background: '#161616', marginBottom: 0 }} />
      </div>

      {/* ── 챗봇 ── */}
      {mode === 'chat' && (
        <div style={{ paddingTop: 16 }}>
          <ChatBot lang={lang} />
        </div>
      )}

      {/* ── 직접 검색 ── */}
      {mode === 'search' && <>

      {/* ── 먹메뉴명 검색 ── */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#f0ece4', marginBottom: 4, ...F }}>
          {lang === 'ko' ? '먹메뉴명 검색' : 'Menu Search'}
        </div>
        <div style={{ fontSize: 11, color: '#555', marginBottom: 12, ...F }}>
          {lang === 'ko' ? '메뉴명으로 식당을 찾아보세요 (2글자 이상)' : 'Search restaurants by menu name (2+ chars)'}
        </div>
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <input
            value={menuQuery}
            onChange={e => handleMenuInput(e.target.value)}
            placeholder={lang === 'ko' ? '예: 라멘, 맥주, 교자...' : 'e.g. ramen, beer, gyoza...'}
            style={{
              width: '100%', background: '#0d0d0d',
              border: `1.5px solid ${menuQuery.length >= 2 ? '#c8a96e' : '#1e1e1e'}`,
              borderRadius: 12, padding: '12px 44px 12px 16px',
              color: '#f0ece4', fontSize: 14, outline: 'none',
              boxSizing: 'border-box', ...F
            }}
          />
          <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18, opacity: 0.5 }}>🔍</span>
        </div>
        {menuError && <div style={{ fontSize: 11, color: '#e05a5a', marginBottom: 8, ...F }}>{menuError}</div>}

        {/* 메뉴 검색 결과 */}
        {menuLoading && (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#555', fontSize: 13, ...F }}>검색 중...</div>
        )}
        {menuSearched && !menuLoading && menuResults.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>😢</div>
            <div style={{ fontSize: 13, color: '#555', ...F }}>
              {lang === 'ko' ? `"${menuQuery}" 메뉴를 파는 식당이 없어요` : `No restaurant found with "${menuQuery}"`}
            </div>
          </div>
        )}
        {menuSearched && !menuLoading && menuResults.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: '#555', letterSpacing: 2, fontWeight: 700, marginBottom: 12, ...F }}>
              {lang === 'ko' ? `"${menuQuery}" 검색 결과 ${menuResults.length}곳` : `${menuResults.length} result${menuResults.length !== 1 ? 's' : ''} for "${menuQuery}"`}
            </div>
            {menuResults.map(({ store, matchedMenus }) => (
              <div key={store.id} style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 14, padding: '14px 16px', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 26 }}>{store.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, ...F }}>{storeName(store)}</div>
                    <a href={store.map_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#c8a96e', textDecoration: 'none' }}>
                      📍 {storeAddr(store)}
                    </a>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {matchedMenus.map((m, i) => (
                    <div key={i} style={{ background: '#141414', border: '1px solid #282828', borderRadius: 8, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, color: '#f0ece4', ...F }}>{highlight(menuName(m), menuQuery)}</span>
                      {m.price && <span style={{ fontSize: 11, color: '#c8a96e' }}>{m.price}원</span>}
                      {m.category && <span style={{ fontSize: 9, color: '#555', background: '#1a1a1a', borderRadius: 4, padding: '1px 5px', ...F }}>{m.category}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 구분선 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, marginTop: menuSearched ? 0 : 8 }}>
          <div style={{ flex: 1, height: 1, background: '#1a1a1a' }} />
          <span style={{ fontSize: 11, color: '#333', ...F }}>{lang === 'ko' ? '카테고리로 검색' : 'Search by Category'}</span>
          <div style={{ flex: 1, height: 1, background: '#1a1a1a' }} />
        </div>
      </div>

      {/* ── 범용 카테고리 검색 ── */}
      <div style={{ padding: '0 20px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#f0ece4', marginBottom: 4, ...F }}>
          {lang === 'ko' ? '먹고 싶은 조합을 선택하세요' : 'Select what you want to eat'}
        </div>
        <div style={{ fontSize: 11, color: '#555', marginBottom: 16, ...F }}>
          {lang === 'ko' ? '카테고리를 선택하면 해당 조합을 파는 식당을 찾아드려요' : 'Select categories to find restaurants with that combo'}
        </div>

        {/* 카테고리 버튼들 — 그룹별 */}
        {(() => {
          const groups: { key: string; label: string; cats: FoodCategory[] }[] = []
          const seen = new Set<string>()
          categories.forEach(cat => {
            const key = cat.group_ko || ''
            if (!seen.has(key)) {
              seen.add(key)
              groups.push({ key, label: `${cat.group_emoji || ''} ${lang === 'en' ? (cat.group_en || cat.group_ko) : cat.group_ko}`.trim(), cats: [] })
            }
            groups[groups.length - 1 < 0 ? 0 : groups.findIndex(g => g.key === key)].cats.push(cat)
          })
          return (
            <div style={{ marginBottom: 16 }}>
              {groups.map(group => (
                <div key={group.key} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: '#c8a96e', fontWeight: 700, letterSpacing: 0.5, marginBottom: 8, ...F }}>
                    {group.label}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {group.cats.map(cat => {
                      const sel = selected.includes(cat.id)
                      return (
                        <button key={cat.id} onClick={() => toggleCat(cat.id)} style={{
                          background: sel ? '#1a2a1a' : '#0d0d0d',
                          border: `1.5px solid ${sel ? '#6fcf97' : '#1e1e1e'}`,
                          borderRadius: 20, padding: '6px 14px',
                          cursor: 'pointer', transition: 'all 0.15s',
                          color: sel ? '#6fcf97' : '#888',
                          fontSize: 13, fontWeight: sel ? 700 : 400, ...F,
                        }}>
                          {sel ? '✓ ' : ''}{catName(cat)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
        })()}

        {/* 선택된 조합 */}
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
                    <span onClick={() => toggleCat(id)} style={{ background: '#141414', border: '1px solid #6fcf97', borderRadius: 20, padding: '4px 10px', fontSize: 12, color: '#6fcf97', cursor: 'pointer', ...F }}>
                      {catName(cat)} ✕
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

        {/* 카테고리 검색 결과 */}
        {searched && !loading && (
          <>
            {results.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>😢</div>
                <div style={{ fontSize: 14, color: '#555', lineHeight: 1.8, ...F }}>
                  {lang === 'ko' ? '해당 조합을 파는 식당이 없어요\n다른 조합으로 검색해보세요!' : 'No restaurants found.\nTry a different combination!'}
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 11, color: '#555', letterSpacing: 2, fontWeight: 700, marginBottom: 14, ...F }}>
                  {lang === 'ko' ? `검색 결과 ${results.length}곳` : `${results.length} restaurant${results.length !== 1 ? 's' : ''} found`}
                </div>
                {results.map(({ store, matchedMenus }) => (
                  <div key={store.id} style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 14, padding: '16px', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                      <div style={{ fontSize: 32 }}>{store.emoji}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 3, ...F }}>{storeName(store)}</div>
                        <a href={store.map_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#c8a96e', textDecoration: 'none' }}>
                          📍 {storeAddr(store)}
                        </a>
                      </div>
                    </div>
                    <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: 12 }}>
                      <div style={{ fontSize: 10, color: '#888', fontWeight: 700, letterSpacing: 1, marginBottom: 10, ...F }}>
                        {lang === 'ko' ? '해당 메뉴' : 'Matching Menus'}
                      </div>
                      {selected.map(catId => {
                        const cat = categories.find(c => c.id === catId)
                        const matched = matchedMenus.filter(m => m.foodCategoryId === catId)
                        if (!cat || matched.length === 0) return null
                        return (
                          <div key={catId} style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 11, color: '#666', marginBottom: 6, fontWeight: 700, ...F }}>{catName(cat)}</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {matched.flatMap(m => m.menus).map((menu, i) => (
                                <div key={i} style={{ background: '#141414', border: '1px solid #282828', borderRadius: 8, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
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
          </>
        )}

        {/* 초기 안내 */}
        {!searched && selected.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 10, paddingBottom: 20 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
              {['라멘/우동 + 맥주/주류', '튀김/치킨 + 음료/차', '밥/덮밥 + 튀김/치킨'].map((combo, i) => (
                <span key={i} style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 16, padding: '5px 12px', fontSize: 11, color: '#555', ...F }}>
                  {combo}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      </> }
    </div>
  )
}

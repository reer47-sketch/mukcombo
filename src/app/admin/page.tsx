'use client'
import { useState, useEffect, useCallback } from 'react'

const fontLink = typeof document !== 'undefined' ? (() => {
  const l = document.createElement('link')
  l.rel = 'stylesheet'
  l.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap'
  document.head.appendChild(l)
  return l
})() : null
void fontLink

const F: React.CSSProperties = { fontFamily: "'Noto Sans KR', sans-serif" }
const inp: React.CSSProperties = { width: '100%', background: '#141414', border: '1px solid #2a2a2a', borderRadius: 8, padding: '10px 14px', color: '#f0ece4', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: "'Noto Sans KR', sans-serif" }

const uid = () => Math.random().toString(36).slice(2, 8)

interface Stats {
  storeCount: number; postCount: number; userCount: number
  stores: { id: string; name: string }[]
  posts: { id: string; store_id: string; likes: number; created_at: string }[]
  users: { id: string; nickname: string; is_blocked: boolean; created_at: string }[]
}

interface Choice { id: string; ko: string; en: string; extraPrice: string }
interface Option { id: string; key: string; labelKo: string; labelEn: string; choices: Choice[] }
interface MenuDraft { id: string; nameKo: string; nameEn: string; price: string; options: Option[] }
interface CatDraft { id: string; nameKo: string; nameEn: string; menus: MenuDraft[] }

const EMPTY_CAT = (): CatDraft => ({ id: uid(), nameKo: '', nameEn: '', menus: [{ id: uid(), nameKo: '', nameEn: '', price: '', options: [] }] })

// ── 가게 등록 폼 ──────────────────────────────────────────
function StoreForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const [storeName, setStoreName] = useState({ ko: '', en: '' })
  const [address, setAddress] = useState({ ko: '', en: '' })
  const [mapUrl, setMapUrl] = useState('')
  const [emoji, setEmoji] = useState('🍜')
  const [cats, setCats] = useState<CatDraft[]>([EMPTY_CAT()])
  const [saving, setSaving] = useState(false)
  const [foodCategories, setFoodCategories] = useState<{id: string; name_ko: string; name_en: string; emoji: string}[]>([])
  const [menuFoodCats, setMenuFoodCats] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/food-categories').then(r => r.json()).then(data => { if (Array.isArray(data)) setFoodCategories(data) })
  }, [])

  const updateCat = (idx: number, updated: CatDraft) => { const c = [...cats]; c[idx] = updated; setCats(c) }
  const deleteCat = (idx: number) => cats.length > 1 && setCats(cats.filter((_, i) => i !== idx))
  const addCat = () => setCats([...cats, EMPTY_CAT()])

  const handleSave = async () => {
    if (!storeName.ko) return alert('가게명을 입력해주세요')
    setSaving(true)
    const categories: Record<string, string[]> = {}
    const prices: Record<string, string> = {}
    const menu_names: Record<string, { ko: string; en: string }> = {}
    const menu_options: Record<string, unknown[]> = {}

    cats.forEach(cat => {
      const menus = cat.menus.map(m => m.nameKo).filter(Boolean)
      if (!cat.nameKo || menus.length === 0) return
      categories[cat.nameKo] = menus
      cat.menus.forEach(m => {
        if (!m.nameKo) return
        prices[m.nameKo] = m.price
        menu_names[m.nameKo] = { ko: m.nameKo, en: m.nameEn }
        if (m.options.length > 0) {
          menu_options[m.nameKo] = m.options.map(opt => ({
            key: opt.key || opt.id, labelKo: opt.labelKo, labelEn: opt.labelEn,
            choices: opt.choices.map(c => ({ ko: c.ko, en: c.en, extraPrice: c.extraPrice ?? '' })),
          }))
        }
      })
    })

    const res = await fetch('/api/stores', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: storeName.ko, nameEn: storeName.en, emoji, address: address.ko, addressEn: address.en, mapUrl, categories, prices, menuNames: menu_names, menuOptions: menu_options }),
    })
    const json = await res.json()
    if (json.id) {
      // menu_items 테이블에 범용 카테고리 연결 저장
      const menuItemsPayload = Object.entries(menuFoodCats)
        .filter(([, catId]) => catId)
        .map(([nameKo, foodCategoryId]) => ({
          storeId: json.id,
          nameKo,
          nameEn: menu_names[nameKo]?.en || '',
          price: prices[nameKo] || '',
          foodCategoryId,
        }))
      if (menuItemsPayload.length > 0) {
        await fetch('/api/menu-items', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(menuItemsPayload),
        })
      }
      alert('가게 등록 완료! 🎉'); onSaved()
    }
    else alert('오류: ' + JSON.stringify(json))
    setSaving(false)
  }

  const inputSt: React.CSSProperties = { background: '#141414', border: '1px solid #222', borderRadius: 7, padding: '8px 10px', color: '#f0ece4', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: "'Noto Sans KR', sans-serif" }

  return (
    <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 14, padding: 24, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#c8a96e', ...F }}>+ 새 가게 등록</div>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 13, ...F }}>✕ 취소</button>
      </div>

      {/* 가게 기본 정보 */}
      <div style={{ background: '#111', borderRadius: 10, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: '#c8a96e', fontWeight: 700, letterSpacing: 1, marginBottom: 12, ...F }}>가게 기본 정보</div>
        <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr', gap: 8, marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 10, color: '#666', marginBottom: 4, ...F }}>이모지</div>
            <input value={emoji} onChange={e => setEmoji(e.target.value)} style={{ ...inputSt, textAlign: 'center', fontSize: 20 }} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#666', marginBottom: 4, ...F }}>🇰🇷 가게명</div>
            <input value={storeName.ko} onChange={e => setStoreName({ ...storeName, ko: e.target.value })} placeholder="고르다" style={{ ...inputSt, fontWeight: 700 }} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#666', marginBottom: 4, ...F }}>🇺🇸 English Name</div>
            <input value={storeName.en} onChange={e => setStoreName({ ...storeName, en: e.target.value })} placeholder="Gorda" style={{ ...inputSt, color: '#c8a96e' }} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 10, color: '#666', marginBottom: 4, ...F }}>📍 주소</div>
            <input value={address.ko} onChange={e => setAddress({ ...address, ko: e.target.value })} placeholder="경기 평택시..." style={inputSt} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#666', marginBottom: 4, ...F }}>📍 Address (EN)</div>
            <input value={address.en} onChange={e => setAddress({ ...address, en: e.target.value })} placeholder="2F, 12 Pyeongtaek..." style={inputSt} />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#666', marginBottom: 4, ...F }}>🗺️ 지도 URL</div>
          <input value={mapUrl} onChange={e => setMapUrl(e.target.value)} placeholder="https://naver.me/..." style={inputSt} />
        </div>
      </div>

      {/* 메뉴 구성 */}
      <div style={{ fontSize: 11, color: '#555', letterSpacing: 2, fontWeight: 700, marginBottom: 12, ...F }}>메뉴 구성</div>
      {cats.map((cat, ci) => (
        <div key={cat.id} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <div style={{ width: 4, height: 32, background: '#c8a96e', borderRadius: 2, flexShrink: 0 }} />
            <input value={cat.nameKo} onChange={e => updateCat(ci, { ...cat, nameKo: e.target.value })} placeholder="카테고리명 (예: 라멘류)" style={{ flex: 2, ...inputSt, fontWeight: 700, fontSize: 14 }} />
            <input value={cat.nameEn} onChange={e => updateCat(ci, { ...cat, nameEn: e.target.value })} placeholder="Category (EN)" style={{ flex: 2, ...inputSt, color: '#c8a96e' }} />
            <button onClick={() => deleteCat(ci)} disabled={cats.length === 1} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: cats.length === 1 ? '#141414' : '#2a1a1a', color: cats.length === 1 ? '#333' : '#e05a5a', cursor: cats.length === 1 ? 'default' : 'pointer', fontSize: 13, flexShrink: 0 }}>✕</button>
          </div>
          {cat.menus.map((menu, mi) => {
            const updateMenu = (updated: MenuDraft) => { const m = [...cat.menus]; m[mi] = updated; updateCat(ci, { ...cat, menus: m }) }
            const deleteMenu = () => cat.menus.length > 1 && updateCat(ci, { ...cat, menus: cat.menus.filter((_, i) => i !== mi) })
            return (
              <div key={menu.id} style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 10, marginBottom: 6, overflow: 'hidden' }}>
                <div style={{ display: 'flex', gap: 7, alignItems: 'center', padding: '8px 10px' }}>
                  <input value={menu.nameKo} onChange={e => updateMenu({ ...menu, nameKo: e.target.value })} placeholder="메뉴명" style={{ flex: 2.5, ...inputSt, fontWeight: 700 }} />
                  <input value={menu.nameEn} onChange={e => updateMenu({ ...menu, nameEn: e.target.value })} placeholder="Menu (EN)" style={{ flex: 2.5, ...inputSt, color: '#c8a96e' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, flex: 1 }}>
                    <input value={menu.price} onChange={e => updateMenu({ ...menu, price: e.target.value })} placeholder="가격" style={{ flex: 1, ...inputSt, textAlign: 'right' }} />
                    <span style={{ fontSize: 10, color: '#555', flexShrink: 0 }}>원</span>
                  </div>
                  <button onClick={deleteMenu} disabled={cat.menus.length === 1} style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', background: cat.menus.length === 1 ? '#141414' : '#2a1a1a', color: cat.menus.length === 1 ? '#333' : '#e05a5a', cursor: cat.menus.length === 1 ? 'default' : 'pointer', fontSize: 11, flexShrink: 0 }}>✕</button>
                </div>
                {menu.options.map((opt, oi) => {
                  const updateOpt = (updated: Option) => { const o = [...menu.options]; o[oi] = updated; updateMenu({ ...menu, options: o }) }
                  return (
                    <div key={opt.id} style={{ background: '#111', margin: '0 8px 6px', borderRadius: 8, padding: '8px 10px', border: '1px solid #1e1e1e' }}>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                        <div style={{ width: 3, height: 24, background: '#c8a96e', borderRadius: 2, flexShrink: 0 }} />
                        <input value={opt.labelKo} onChange={e => updateOpt({ ...opt, labelKo: e.target.value })} placeholder="옵션명" style={{ flex: 1, ...inputSt, fontSize: 12 }} />
                        <input value={opt.labelEn} onChange={e => updateOpt({ ...opt, labelEn: e.target.value })} placeholder="Option (EN)" style={{ flex: 1, ...inputSt, fontSize: 12, color: '#c8a96e' }} />
                        <button onClick={() => updateMenu({ ...menu, options: menu.options.filter((_, i) => i !== oi) })} style={{ width: 22, height: 22, borderRadius: '50%', border: 'none', background: '#2a1a1a', color: '#e05a5a', cursor: 'pointer', fontSize: 10, flexShrink: 0 }}>✕</button>
                      </div>
                      {opt.choices.map((c, chi) => {
                        const updateChoice = (updated: Choice) => { const ch = [...opt.choices]; ch[chi] = updated; updateOpt({ ...opt, choices: ch }) }
                        return (
                          <div key={c.id} style={{ display: 'flex', gap: 4, marginBottom: 4, paddingLeft: 11 }}>
                            <input value={c.ko} onChange={e => updateChoice({ ...c, ko: e.target.value })} placeholder="선택지" style={{ flex: 2, ...inputSt, fontSize: 11, padding: '5px 8px' }} />
                            <input value={c.en} onChange={e => updateChoice({ ...c, en: e.target.value })} placeholder="Choice" style={{ flex: 2, ...inputSt, fontSize: 11, padding: '5px 8px', color: '#c8a96e' }} />
                            <input value={c.extraPrice} onChange={e => updateChoice({ ...c, extraPrice: e.target.value })} placeholder="+0" style={{ flex: 1, ...inputSt, fontSize: 11, padding: '5px 8px', textAlign: 'right', color: '#6fcf97' }} />
                            <button onClick={() => opt.choices.length > 1 && updateOpt({ ...opt, choices: opt.choices.filter((_, i) => i !== chi) })} disabled={opt.choices.length <= 1} style={{ width: 20, height: 20, borderRadius: '50%', border: 'none', background: opt.choices.length > 1 ? '#2a1a1a' : '#181818', color: opt.choices.length > 1 ? '#e05a5a' : '#333', cursor: opt.choices.length > 1 ? 'pointer' : 'default', fontSize: 9, flexShrink: 0 }}>✕</button>
                          </div>
                        )
                      })}
                      <button onClick={() => updateOpt({ ...opt, choices: [...opt.choices, { id: uid(), ko: '', en: '', extraPrice: '' }] })} style={{ marginLeft: 11, marginTop: 2, background: 'none', border: '1px dashed #2a2a2a', borderRadius: 5, padding: '2px 8px', color: '#555', fontSize: 10, cursor: 'pointer', ...F }}>+ 선택지</button>
                    </div>
                  )
                })}
                <div style={{ padding: '0 8px 8px' }}>
                  <button onClick={() => updateMenu({ ...menu, options: [...menu.options, { id: uid(), key: uid(), labelKo: '', labelEn: '', choices: [{ id: uid(), ko: '', en: '', extraPrice: '' }, { id: uid(), ko: '', en: '', extraPrice: '' }] }] })} style={{ width: '100%', background: 'none', border: '1px dashed #222', borderRadius: 6, padding: '5px', color: '#484848', fontSize: 11, cursor: 'pointer', ...F }}>
                    ⚙ 옵션 추가
                  </button>
                </div>
              </div>
            )
          })}
          <button onClick={() => updateCat(ci, { ...cat, menus: [...cat.menus, { id: uid(), nameKo: '', nameEn: '', price: '', options: [] }] })} style={{ width: '100%', background: '#0d0d0d', border: '1px dashed #1e1e1e', borderRadius: 8, padding: '7px', color: '#484848', fontSize: 12, cursor: 'pointer', ...F }}>
            + 메뉴 추가
          </button>
        </div>
      ))}
      <button onClick={addCat} style={{ width: '100%', background: '#0d0d0d', border: '2px dashed #1a1a1a', borderRadius: 10, padding: '10px', color: '#484848', fontSize: 13, cursor: 'pointer', fontWeight: 700, marginBottom: 20, ...F }}>
        + 카테고리 추가
      </button>

      <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: 14, background: saving ? '#1a1a1a' : '#c8a96e', color: saving ? '#555' : '#080808', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', ...F }}>
        {saving ? '저장 중...' : '가게 등록 완료 🎉'}
      </button>
    </div>
  )
}

// ── 메인 어드민 ───────────────────────────────────────────
export default function AdminPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'stores' | 'posts' | 'users' | 'categories'>('overview')
  const [foodCategories, setFoodCategories] = useState<{id: string; name_ko: string; name_en: string}[]>([])
  const [newCatKo, setNewCatKo] = useState('')
  const [newCatEn, setNewCatEn] = useState('')
  const [stores, setStores] = useState<{ id: string; name: string; name_en: string; emoji: string }[]>([])
  const [posts, setPosts] = useState<{ id: string; store_id: string; user_name: string; review: string; likes: number; created_at: string }[]>([])
  const [creds, setCreds] = useState({ username: '', password: '' })
  const [showAddStore, setShowAddStore] = useState(false)

  const loadStats = useCallback(async (u: string, p: string) => {
    const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'stats', username: u, password: p }) })
    const json = await res.json()
    if (json.success) setStats(json.stats)
  }, [])

  const loadStores = useCallback(async () => {
    const res = await fetch('/api/stores')
    const data = await res.json()
    if (Array.isArray(data)) setStores(data)
  }, [])

  const loadPosts = useCallback(async () => {
    const res = await fetch('/api/posts')
    const data = await res.json()
    if (Array.isArray(data)) setPosts(data)
  }, [])

  const loadFoodCats = useCallback(async () => {
    const res = await fetch('/api/food-categories')
    const data = await res.json()
    if (Array.isArray(data)) setFoodCategories(data)
  }, [])

  useEffect(() => {
    if (loggedIn) { loadStats(creds.username, creds.password); loadStores(); loadPosts(); loadFoodCats() }
  }, [loggedIn, creds, loadStats, loadStores, loadPosts, loadFoodCats])

  const handleLogin = async () => {
    setLoading(true); setLoginError('')
    const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'login', username, password }) })
    const json = await res.json()
    if (json.success) { setCreds({ username, password }); setLoggedIn(true) }
    else setLoginError(json.error)
    setLoading(false)
  }

  const deleteStore = async (storeId: string, storeName: string) => {
    if (!confirm(`"${storeName}" 가게를 삭제할까요?\n연결된 게시글도 모두 삭제됩니다.`)) return
    const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'deleteStore', storeId, ...creds }) })
    const json = await res.json()
    if (json.success) { setStores(stores.filter(s => s.id !== storeId)); alert('삭제됐어요!') }
    else alert('삭제 실패: ' + json.error)
  }

  const deletePost = async (postId: string) => {
    if (!confirm('이 게시글을 삭제할까요?')) return
    const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'deletePost', postId, ...creds }) })
    const json = await res.json()
    if (json.success) { setPosts(posts.filter(p => p.id !== postId)); alert('삭제됐어요!') }
    else alert('삭제 실패: ' + json.error)
  }

  const toggleBlock = async (userId: string, blocked: boolean, nickname: string) => {
    if (!confirm(`"${nickname}" 사용자를 ${blocked ? '차단' : '차단 해제'}할까요?`)) return
    const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'blockUser', userId, blocked, ...creds }) })
    const json = await res.json()
    if (json.success) setStats(prev => prev ? { ...prev, users: prev.users.map(u => u.id === userId ? { ...u, is_blocked: blocked } : u) } : prev)
  }

  const tab = (key: typeof activeTab, label: string) => (
    <button onClick={() => setActiveTab(key)} style={{ background: activeTab === key ? '#c8a96e' : '#141414', color: activeTab === key ? '#080808' : '#888', border: 'none', borderRadius: 16, padding: '7px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', ...F }}>
      {label}
    </button>
  )

  // ── 로그인 화면 ──
  if (!loggedIn) return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', ...F }}>
      <div style={{ width: 360, background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 16, padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-1px', color: '#f0ece4' }}>
            <span style={{ color: '#c8a96e' }}>먹</span>+콤보
          </div>
          <div style={{ fontSize: 11, color: '#555', letterSpacing: 3, marginTop: 4 }}>ADMIN</div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>아이디</div>
          <input value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder="admin" style={inp} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>비밀번호</div>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder="••••••••" style={inp} />
        </div>
        {loginError && <div style={{ fontSize: 12, color: '#e05a5a', marginBottom: 12, textAlign: 'center' }}>{loginError}</div>}
        <button onClick={handleLogin} disabled={loading} style={{ width: '100%', padding: 12, background: '#c8a96e', color: '#080808', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', ...F }}>
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </div>
    </div>
  )

  // ── 대시보드 ──
  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: '#f0ece4', ...F }}>
      <div style={{ background: '#0d0d0d', borderBottom: '1px solid #161616', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: 18, fontWeight: 900 }}><span style={{ color: '#c8a96e' }}>먹</span>+콤보</span>
          <span style={{ fontSize: 11, color: '#c8a96e', marginLeft: 10, fontWeight: 700 }}>ADMIN</span>
        </div>
        <button onClick={() => setLoggedIn(false)} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888', borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer', ...F }}>로그아웃</button>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {tab('overview', '📊 개요')}
          {tab('stores', '🏪 가게')}
          {tab('posts', '📝 게시글')}
          {tab('users', '👥 사용자')}
          {tab('categories', '🏷️ 카테고리')}
        </div>

        {/* 개요 */}
        {activeTab === 'overview' && stats && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
              {[{ label: '등록 가게', value: stats.storeCount, color: '#c8a96e' }, { label: '전체 게시글', value: stats.postCount, color: '#6fcf97' }, { label: '전체 사용자', value: stats.userCount, color: '#56ccf2' }].map(item => (
                <div key={item.label} style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 12, padding: '20px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 900, color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{item.label}</div>
                </div>
              ))}
            </div>
            <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 12, color: '#c8a96e', fontWeight: 700, letterSpacing: 1, marginBottom: 16 }}>가게별 조합 수</div>
              {stores.map(s => {
                const count = posts.filter(p => p.store_id === s.id).length
                const max = Math.max(...stores.map(st => posts.filter(p => p.store_id === st.id).length), 1)
                return (
                  <div key={s.id} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13 }}>{s.emoji} {s.name}</span>
                      <span style={{ fontSize: 13, color: '#c8a96e', fontWeight: 700 }}>{count}</span>
                    </div>
                    <div style={{ height: 6, background: '#1a1a1a', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(count / max) * 100}%`, background: '#c8a96e', borderRadius: 3 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 가게 관리 */}
        {activeTab === 'stores' && (
          <div>
            {/* 가게 추가 버튼 */}
            {!showAddStore && (
              <button onClick={() => setShowAddStore(true)} style={{ width: '100%', background: '#0d0d0d', border: '2px dashed #c8a96e', borderRadius: 14, padding: 16, color: '#c8a96e', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 20, ...F }}>
                + 새 가게 등록
              </button>
            )}

            {/* 가게 등록 폼 */}
            {showAddStore && (
              <StoreForm
                onSaved={() => { setShowAddStore(false); loadStores(); loadStats(creds.username, creds.password) }}
                onCancel={() => setShowAddStore(false)}
              />
            )}

            <div style={{ fontSize: 12, color: '#555', letterSpacing: 2, fontWeight: 700, marginBottom: 16 }}>등록된 가게 ({stores.length})</div>
            {stores.map(s => (
              <div key={s.id} style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 12, padding: '16px 18px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 28 }}>{s.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{s.name_en}</div>
                  <div style={{ fontSize: 11, color: '#6fcf97', marginTop: 2 }}>게시글 {posts.filter(p => p.store_id === s.id).length}개</div>
                </div>
                <button onClick={() => deleteStore(s.id, s.name)} style={{ background: '#2a1a1a', border: '1px solid #3a2a2a', color: '#e05a5a', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', ...F }}>
                  🗑 삭제
                </button>
              </div>
            ))}
            {stores.length === 0 && <div style={{ color: '#444', textAlign: 'center', padding: 40 }}>등록된 가게가 없어요</div>}
          </div>
        )}

        {/* 게시글 관리 */}
        {activeTab === 'posts' && (
          <div>
            <div style={{ fontSize: 12, color: '#555', letterSpacing: 2, fontWeight: 700, marginBottom: 16 }}>전체 게시글 ({posts.length})</div>
            {posts.map(post => {
              const store = stores.find(s => s.id === post.store_id)
              return (
                <div key={post.id} style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 12, padding: '14px 16px', marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, background: '#141414', borderRadius: 6, padding: '2px 8px', color: '#c8a96e' }}>{store?.emoji} {store?.name}</span>
                      <span style={{ fontSize: 11, color: '#555' }}>{post.user_name}</span>
                      <span style={{ fontSize: 11, color: '#555' }}>❤️ {post.likes}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#ccc', lineHeight: 1.5 }}>{post.review}</div>
                    <div style={{ fontSize: 10, color: '#444', marginTop: 4 }}>{new Date(post.created_at).toLocaleString('ko-KR')}</div>
                  </div>
                  <button onClick={() => deletePost(post.id)} style={{ background: '#2a1a1a', border: '1px solid #3a2a2a', color: '#e05a5a', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0, ...F }}>🗑</button>
                </div>
              )
            })}
            {posts.length === 0 && <div style={{ color: '#444', textAlign: 'center', padding: 40 }}>게시글이 없어요</div>}
          </div>
        )}

        {/* 범용 카테고리 관리 */}
        {activeTab === 'categories' && (
          <div>
            <div style={{ fontSize: 12, color: '#555', letterSpacing: 2, fontWeight: 700, marginBottom: 16 }}>먹검색 범용 카테고리 관리</div>
            {/* 새 카테고리 추가 */}
            <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: '#c8a96e', fontWeight: 700, marginBottom: 12, ...F }}>+ 새 카테고리 추가</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 10, color: '#666', marginBottom: 4, ...F }}>🇰🇷 한국어</div>
                  <input value={newCatKo} onChange={e => setNewCatKo(e.target.value)} placeholder="예: 라멘/우동" style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#666', marginBottom: 4, ...F }}>🇺🇸 English</div>
                  <input value={newCatEn} onChange={e => setNewCatEn(e.target.value)} placeholder="e.g. Ramen/Udon" style={inp} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button onClick={async () => {
                    if (!newCatKo.trim()) return alert('한국어 이름을 입력해주세요')
                    const res = await fetch('/api/food-categories', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name_ko: newCatKo.trim(), name_en: newCatEn.trim() || newCatKo.trim() })
                    })
                    const json = await res.json()
                    if (json.id) { setFoodCategories([...foodCategories, json]); setNewCatKo(''); setNewCatEn('') }
                    else alert('오류: ' + JSON.stringify(json))
                  }} style={{ padding: '10px 16px', background: '#c8a96e', color: '#080808', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', ...F }}>
                    추가
                  </button>
                </div>
              </div>
            </div>
            {/* 카테고리 목록 */}
            {foodCategories.map(fc => (
              <div key={fc.id} style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 10, padding: '12px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, ...F }}>{fc.name_ko}</span>
                  <span style={{ fontSize: 12, color: '#666', marginLeft: 10, ...F }}>{fc.name_en}</span>
                </div>
                <span style={{ fontSize: 10, color: '#444', ...F }}>{fc.id}</span>
                <button onClick={async () => {
                  if (!confirm(`"${fc.name_ko}" 카테고리를 삭제할까요?`)) return
                  const res = await fetch('/api/food-categories', {
                    method: 'DELETE', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: fc.id })
                  })
                  const json = await res.json()
                  if (json.success) setFoodCategories(foodCategories.filter(c => c.id !== fc.id))
                  else alert('삭제 실패: ' + JSON.stringify(json))
                }} style={{ background: '#2a1a1a', border: '1px solid #3a2a2a', color: '#e05a5a', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', ...F }}>
                  🗑 삭제
                </button>
              </div>
            ))}
            {foodCategories.length === 0 && <div style={{ color: '#444', textAlign: 'center', padding: 40 }}>카테고리가 없어요</div>}
          </div>
        )}

        {/* 사용자 관리 */}
        {activeTab === 'users' && stats && (
          <div>
            <div style={{ fontSize: 12, color: '#555', letterSpacing: 2, fontWeight: 700, marginBottom: 16 }}>전체 사용자 ({stats.userCount})</div>
            {stats.users.map(user => (
              <div key={user.id} style={{ background: '#0d0d0d', border: `1px solid ${user.is_blocked ? '#3a1a1a' : '#1e1e1e'}`, borderRadius: 12, padding: '14px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#161616', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>😊</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {user.nickname}
                    {user.is_blocked && <span style={{ fontSize: 10, background: '#3a1a1a', color: '#e05a5a', borderRadius: 4, padding: '2px 6px' }}>차단됨</span>}
                  </div>
                  <div style={{ fontSize: 10, color: '#444', marginTop: 2 }}>{new Date(user.created_at).toLocaleString('ko-KR')} 가입</div>
                </div>
                <button onClick={() => toggleBlock(user.id, !user.is_blocked, user.nickname)} style={{ background: user.is_blocked ? '#1a2a1a' : '#2a1a1a', border: `1px solid ${user.is_blocked ? '#2a3a2a' : '#3a2a2a'}`, color: user.is_blocked ? '#6fcf97' : '#e05a5a', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', ...F }}>
                  {user.is_blocked ? '차단 해제' : '차단'}
                </button>
              </div>
            ))}
            {stats.users.length === 0 && <div style={{ color: '#444', textAlign: 'center', padding: 40 }}>사용자가 없어요</div>}
          </div>
        )}
      </div>
    </div>
  )
}

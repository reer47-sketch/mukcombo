'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import MenuEditor from '@/components/MenuEditor'
import { T, type Lang, type Translations } from '@/lib/i18n'
import type { Store } from '@/types'

const F: React.CSSProperties = { fontFamily: "'Noto Sans KR', sans-serif" }
const inp: React.CSSProperties = {
  width: '100%', background: '#141414', border: '1px solid #2a2a2a',
  borderRadius: 8, padding: '10px 14px', color: '#f0ece4', fontSize: 14,
  outline: 'none', boxSizing: 'border-box', fontFamily: "'Noto Sans KR', sans-serif"
}
const uid = () => Math.random().toString(36).slice(2, 8)

interface AdminStats {
  storeCount: number; postCount: number; userCount: number
  stores: { id: string; name: string; emoji: string; subscription_status: string; is_premium: boolean; owner_id: string | null }[]
  posts: { id: string; store_id: string; likes: number; created_at: string }[]
  users: { id: string; nickname: string; email: string | null; is_blocked: boolean; role: string; created_at: string }[]
}
interface Choice { id: string; ko: string; en: string; extraPrice: string }
interface Option { id: string; key: string; labelKo: string; labelEn: string; choices: Choice[] }
interface MenuDraft { id: string; nameKo: string; nameEn: string; price: string; options: Option[] }
interface CatDraft { id: string; nameKo: string; nameEn: string; menus: MenuDraft[] }

const EMPTY_CAT = (): CatDraft => ({
  id: uid(), nameKo: '', nameEn: '',
  menus: [{ id: uid(), nameKo: '', nameEn: '', price: '', options: [] }]
})

const inputSt: React.CSSProperties = {
  background: '#141414', border: '1px solid #222', borderRadius: 7, padding: '8px 10px',
  color: '#f0ece4', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box', ...F,
}

// ── 가게 등록 폼 ──────────────────────────────────────────
function StoreForm({ userId, onSaved, onCancel }: { userId?: string; onSaved: () => void; onCancel: () => void }) {
  const [storeName, setStoreName] = useState({ ko: '', en: '' })
  const [address, setAddress] = useState({ ko: '', en: '' })
  const [mapUrl, setMapUrl] = useState('')
  const [emoji, setEmoji] = useState('🍜')
  const [cats, setCats] = useState<CatDraft[]>([EMPTY_CAT()])
  const [saving, setSaving] = useState(false)
  const [foodCategories, setFoodCategories] = useState<{ id: string; name_ko: string; name_en: string; emoji: string; group_ko: string; group_en: string; group_emoji: string }[]>([])
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
      body: JSON.stringify({
        name: storeName.ko, nameEn: storeName.en, emoji,
        address: address.ko, addressEn: address.en, mapUrl,
        categories, prices, menuNames: menu_names, menuOptions: menu_options,
        ownerId: userId || null,
      }),
    })
    const json = await res.json()
    if (json.id) {
      const payload = Object.entries(menuFoodCats)
        .filter(([, catId]) => catId)
        .map(([nameKo, foodCategoryId]) => ({
          storeId: json.id, nameKo, nameEn: menu_names[nameKo]?.en || '',
          price: prices[nameKo] || '', foodCategoryId,
        }))
      if (payload.length > 0) {
        await fetch('/api/menu-items', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      alert('가게 등록 완료! 🎉'); onSaved()
    } else alert('오류: ' + JSON.stringify(json))
    setSaving(false)
  }

  return (
    <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 14, padding: 24, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#c8a96e', ...F }}>+ 새 가게 등록</div>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 13, ...F }}>✕ 취소</button>
      </div>

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

// ── 로그인 폼 ─────────────────────────────────────────────
function LoginForm({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleEmailAuth = async () => {
    setLoading(true); setError(''); setMessage('')
    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { name } }
      })
      if (error) setError(error.message)
      else setMessage('이메일을 확인해주세요! 인증 링크를 보내드렸어요 📧')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError('이메일 또는 비밀번호가 틀렸어요')
      else onLoggedIn()
    }
    setLoading(false)
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ maxWidth: 360, margin: '0 auto', background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 20, padding: 28 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#c8a96e', letterSpacing: 1, ...F }}>점주 / 관리자 로그인</div>
          <div style={{ fontSize: 11, color: '#444', marginTop: 6, ...F }}>가게를 운영하시나요? 로그인 후 가게를 등록하세요</div>
        </div>

        <div style={{ display: 'flex', background: '#141414', borderRadius: 10, padding: 4, marginBottom: 20 }}>
          {(['login', 'signup'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); setMessage('') }}
              style={{ flex: 1, padding: '8px', background: mode === m ? '#c8a96e' : 'transparent', color: mode === m ? '#080808' : '#666', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', ...F }}>
              {m === 'login' ? '로그인' : '회원가입'}
            </button>
          ))}
        </div>

        <button onClick={handleGoogle}
          style={{ width: '100%', padding: '10px', background: '#fff', color: '#333', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 14, ...F }}>
          <svg width="16" height="16" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.9 29.5 5 24 5 12.4 5 3 14.4 3 26s9.4 21 21 21 21-9.4 21-21c0-1.3-.2-2.6-.4-3.9z"/>
            <path fill="#FF3D00" d="M6.3 15.5l6.6 4.8C14.7 16.5 19 14 24 14c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 8.9 29.5 7 24 7 16.3 7 9.7 11.3 6.3 15.5z"/>
            <path fill="#4CAF50" d="M24 43c5.2 0 10-1.9 13.6-5l-6.3-5.3C29.5 34.6 26.9 35.5 24 35.5c-5.3 0-9.7-3.3-11.3-8.1l-6.6 5.1C9.6 38.5 16.3 43 24 43z"/>
            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.3 5.3C40.8 35.7 45 30.3 45 24c0-1.3-.2-2.6-.4-3.9z"/>
          </svg>
          Google로 {mode === 'login' ? '로그인' : '가입'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1, height: 1, background: '#1e1e1e' }} />
          <span style={{ fontSize: 11, color: '#444' }}>또는</span>
          <div style={{ flex: 1, height: 1, background: '#1e1e1e' }} />
        </div>

        {mode === 'signup' && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 5, ...F }}>이름</div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="홍길동" style={inp} />
          </div>
        )}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 5, ...F }}>이메일</div>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleEmailAuth()} placeholder="email@example.com" style={inp} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 5, ...F }}>비밀번호</div>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleEmailAuth()} placeholder="8자 이상" style={inp} />
        </div>

        {error && <div style={{ fontSize: 12, color: '#e05a5a', marginBottom: 10, textAlign: 'center', ...F }}>{error}</div>}
        {message && <div style={{ fontSize: 12, color: '#6fcf97', marginBottom: 10, textAlign: 'center', ...F }}>{message}</div>}

        <button onClick={handleEmailAuth} disabled={loading}
          style={{ width: '100%', padding: 12, background: '#c8a96e', color: '#080808', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', ...F }}>
          {loading ? '처리 중...' : mode === 'login' ? '로그인' : '가입하기'}
        </button>
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────
export default function DashboardTab({ lang }: { lang: Lang }) {
  const t = T[lang] as Translations

  const [user, setUser] = useState<{ id: string; email: string; name?: string } | null>(null)
  const [token, setToken] = useState('')
  const [role, setRole] = useState<'admin' | 'owner' | 'user' | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  // 어드민 상태
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [adminStores, setAdminStores] = useState<{ id: string; name: string; name_en: string; emoji: string; subscription_status: string; is_premium: boolean; owner_id: string | null }[]>([])
  const [adminPosts, setAdminPosts] = useState<{ id: string; store_id: string; user_name: string; review: string; likes: number; created_at: string }[]>([])
  const [foodCategories, setFoodCategories] = useState<{ id: string; name_ko: string; name_en: string; group_ko: string; group_en: string; group_emoji: string }[]>([])
  const [adminTab, setAdminTab] = useState<'overview' | 'stores' | 'posts' | 'users' | 'categories'>('overview')
  const [newCatKo, setNewCatKo] = useState('')
  const [newCatEn, setNewCatEn] = useState('')

  // 점주 상태
  const [myStores, setMyStores] = useState<Store[]>([])
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [showAddStore, setShowAddStore] = useState(false)

  const adminFetch = useCallback((path: string, opts: RequestInit = {}) =>
    fetch(path, { ...opts, headers: { ...(opts.headers as Record<string, string> || {}), Authorization: `Bearer ${token}` } })
  , [token])

  const loadAdminData = useCallback(async (tok: string) => {
    const [statsRes, storesRes, postsRes, catsRes] = await Promise.all([
      fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` }, body: JSON.stringify({ action: 'stats' }) }),
      fetch('/api/stores'),
      fetch('/api/posts'),
      fetch('/api/food-categories'),
    ])
    const [statsJson, storesJson, postsJson, catsJson] = await Promise.all([
      statsRes.json(), storesRes.json(), postsRes.json(), catsRes.json()
    ])
    if (statsJson.success) setStats(statsJson.stats)
    if (Array.isArray(storesJson)) setAdminStores(storesJson)
    if (Array.isArray(postsJson)) setAdminPosts(postsJson)
    if (Array.isArray(catsJson)) setFoodCategories(catsJson)
  }, [])

  const loadMyStores = useCallback(async (userId: string) => {
    const res = await fetch(`/api/owner?user_id=${userId}`)
    const data = await res.json()
    setMyStores(Array.isArray(data) ? data : [])
  }, [])

  const initSession = useCallback(async (session: { user: { id: string; email?: string; user_metadata?: { name?: string } }; access_token: string } | null) => {
    if (!session) { setAuthLoading(false); return }
    const u = session.user
    setUser({ id: u.id, email: u.email || '', name: u.user_metadata?.name })
    setToken(session.access_token)

    // users 테이블 자동 동기화 (최초 로그인 시 레코드 생성)
    await fetch('/api/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: u.id, nickname: u.user_metadata?.name || u.email?.split('@')[0] || '사용자', email: u.email || '' }),
    })

    const roleRes = await fetch('/api/auth/role', {
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
    const { role: r } = await roleRes.json()
    setRole(r)
    if (r === 'admin') {
      await loadAdminData(session.access_token)
    } else if (r === 'owner') {
      await loadMyStores(u.id)
    }
    setAuthLoading(false)
  }, [loadAdminData, loadMyStores])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      initSession(data.session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) initSession(session)
    })
    return () => subscription.unsubscribe()
  }, [initSession])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null); setToken(''); setRole(null)
    setStats(null); setAdminStores([]); setAdminPosts([]); setMyStores([])
  }

  const deleteStore = async (storeId: string, storeName: string) => {
    if (!confirm(`"${storeName}" 가게를 삭제할까요?\n연결된 게시글도 모두 삭제됩니다.`)) return
    const res = await adminFetch('/api/admin', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'deleteStore', storeId })
    })
    const json = await res.json()
    if (json.success) { setAdminStores(s => s.filter(x => x.id !== storeId)); alert('삭제됐어요!') }
    else alert('삭제 실패: ' + json.error)
  }

  const deletePost = async (postId: string) => {
    if (!confirm('이 게시글을 삭제할까요?')) return
    const res = await adminFetch('/api/admin', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'deletePost', postId })
    })
    const json = await res.json()
    if (json.success) setAdminPosts(p => p.filter(x => x.id !== postId))
    else alert('삭제 실패: ' + json.error)
  }

  const toggleBlock = async (userId: string, blocked: boolean, nickname: string) => {
    if (!confirm(`"${nickname}" 사용자를 ${blocked ? '차단' : '차단 해제'}할까요?`)) return
    const res = await adminFetch('/api/admin', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'blockUser', userId, blocked })
    })
    const json = await res.json()
    if (json.success) {
      setStats(prev => prev ? { ...prev, users: prev.users.map(u => u.id === userId ? { ...u, is_blocked: blocked } : u) } : prev)
    }
  }

  const setUserRole = async (userId: string, role: string, nickname: string) => {
    if (!confirm(`"${nickname}" 사용자를 ${role === 'owner' ? '점주' : '일반 사용자'}로 변경할까요?`)) return
    const res = await adminFetch('/api/admin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setUserRole', userId, role })
    })
    const json = await res.json()
    if (json.success) {
      setStats(prev => prev ? { ...prev, users: prev.users.map(u => u.id === userId ? { ...u, role } : u) } : prev)
    } else alert('변경 실패: ' + json.error)
  }

  const setStoreStatus = async (storeId: string, updates: { subscription_status?: string; is_premium?: boolean }) => {
    const res = await adminFetch('/api/admin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setStoreStatus', storeId, ...updates })
    })
    const json = await res.json()
    if (json.success) {
      setAdminStores(prev => prev.map(s => s.id === storeId ? { ...s, ...updates } : s))
    } else alert('변경 실패: ' + json.error)
  }

  const handleSaveStore = async (updated: Store) => {
    const res = await fetch('/api/stores', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: updated.id, name: updated.name, nameEn: updated.name_en,
        menuNames: updated.menu_names, categories: updated.categories,
        prices: updated.prices, menuOptions: updated.menu_options,
      }),
    })
    const saved = await res.json()
    setMyStores(s => s.map(x => x.id === saved.id ? saved : x))
    setEditingStore(null)
  }

  if (authLoading) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#555', ...F }}>불러오는 중...</div>
    )
  }

  if (!user) {
    return <LoginForm onLoggedIn={() => supabase.auth.getSession().then(({ data }) => initSession(data.session))} />
  }

  return (
    <div style={{ padding: 20, paddingBottom: 60 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #1a1a1a' }}>
        <div>
          {role === 'admin'
            ? <span style={{ fontSize: 12, color: '#e05a5a', fontWeight: 700, letterSpacing: 2, ...F }}>ADMIN</span>
            : <span style={{ fontSize: 12, color: '#c8a96e', fontWeight: 700, ...F }}>점주 포털</span>
          }
          <div style={{ fontSize: 11, color: '#444', marginTop: 3, ...F }}>{user.name || user.email}</div>
        </div>
        <button onClick={handleLogout} style={{ background: '#141414', border: '1px solid #2a2a2a', color: '#888', borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer', ...F }}>
          로그아웃
        </button>
      </div>

      {/* ══════ 일반 사용자 UI ══════ */}
      {role === 'user' && (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>😊</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#f0ece4', marginBottom: 8, ...F }}>일반 사용자 계정입니다</div>
          <div style={{ fontSize: 13, color: '#555', lineHeight: 1.7, ...F }}>
            가게 등록 및 관리는 점주 계정이 필요해요.<br />
            점주 등록을 원하시면 관리자에게 문의해주세요.
          </div>
        </div>
      )}

      {/* ══════ 어드민 UI ══════ */}
      {role === 'admin' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {([
              ['overview', '📊 개요'], ['stores', '🏪 가게'],
              ['posts', '📝 게시글'], ['users', '👥 사용자'], ['categories', '🏷️ 카테고리'],
            ] as const).map(([k, label]) => (
              <button key={k} onClick={() => setAdminTab(k)}
                style={{ background: adminTab === k ? '#c8a96e' : '#141414', color: adminTab === k ? '#080808' : '#888', border: 'none', borderRadius: 16, padding: '7px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', ...F }}>
                {label}
              </button>
            ))}
          </div>

          {adminTab === 'overview' && stats && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                {[{ label: '등록 가게', value: stats.storeCount, color: '#c8a96e' }, { label: '전체 게시글', value: stats.postCount, color: '#6fcf97' }, { label: '전체 사용자', value: stats.userCount, color: '#56ccf2' }].map(item => (
                  <div key={item.label} style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 12, padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: item.color }}>{item.value}</div>
                    <div style={{ fontSize: 11, color: '#666', marginTop: 4, ...F }}>{item.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 11, color: '#c8a96e', fontWeight: 700, letterSpacing: 1, marginBottom: 14, ...F }}>가게별 조합 수</div>
                {adminStores.map(s => {
                  const count = adminPosts.filter(p => p.store_id === s.id).length
                  const max = Math.max(...adminStores.map(st => adminPosts.filter(p => p.store_id === st.id).length), 1)
                  return (
                    <div key={s.id} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 13, ...F }}>{(s as any).emoji} {s.name}</span>
                        <span style={{ fontSize: 13, color: '#c8a96e', fontWeight: 700 }}>{count}</span>
                      </div>
                      <div style={{ height: 5, background: '#1a1a1a', borderRadius: 3 }}>
                        <div style={{ height: '100%', width: `${(count / max) * 100}%`, background: '#c8a96e', borderRadius: 3 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {adminTab === 'stores' && (
            <div>
              <div style={{ fontSize: 11, color: '#555', letterSpacing: 2, fontWeight: 700, marginBottom: 14, ...F }}>등록된 가게 ({adminStores.length})</div>
              {adminStores.map(s => {
                const statusColor: Record<string, string> = { active: '#6fcf97', trial: '#c8a96e', suspended: '#e05a5a' }
                const statusLabel: Record<string, string> = { active: '활성', trial: '트라이얼', suspended: '정지' }
                const nextStatus: Record<string, string> = { trial: 'active', active: 'suspended', suspended: 'trial' }
                return (
                  <div key={s.id} style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 26 }}>{s.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: 14, ...F }}>{s.name}</span>
                          {s.is_premium && <span style={{ fontSize: 10, background: '#f2994a22', color: '#f2994a', borderRadius: 4, padding: '2px 6px', fontWeight: 700, ...F }}>PREMIUM</span>}
                          <span style={{ fontSize: 10, background: statusColor[s.subscription_status] + '22', color: statusColor[s.subscription_status], borderRadius: 4, padding: '2px 6px', fontWeight: 700, ...F }}>
                            {statusLabel[s.subscription_status] || s.subscription_status}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: '#555', marginTop: 2, ...F }}>{s.name_en}</div>
                        <div style={{ fontSize: 11, color: '#6fcf97', marginTop: 2, ...F }}>게시글 {adminPosts.filter(p => p.store_id === s.id).length}개</div>
                      </div>
                      <button onClick={() => deleteStore(s.id, s.name)} style={{ background: '#2a1a1a', border: '1px solid #3a2a2a', color: '#e05a5a', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', ...F }}>🗑</button>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 10, paddingTop: 10, borderTop: '1px solid #1a1a1a' }}>
                      <button
                        onClick={() => setStoreStatus(s.id, { subscription_status: nextStatus[s.subscription_status] || 'trial' })}
                        style={{ fontSize: 11, background: '#141414', border: '1px solid #2a2a2a', color: '#aaa', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', ...F }}>
                        구독: {statusLabel[s.subscription_status]} →
                      </button>
                      <button
                        onClick={() => setStoreStatus(s.id, { is_premium: !s.is_premium })}
                        style={{ fontSize: 11, background: s.is_premium ? '#f2994a22' : '#141414', border: `1px solid ${s.is_premium ? '#f2994a44' : '#2a2a2a'}`, color: s.is_premium ? '#f2994a' : '#888', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', ...F }}>
                        {s.is_premium ? '★ 프리미엄 해제' : '☆ 프리미엄 설정'}
                      </button>
                    </div>
                  </div>
                )
              })}
              {adminStores.length === 0 && <div style={{ color: '#444', textAlign: 'center', padding: 40, ...F }}>등록된 가게가 없어요</div>}
            </div>
          )}

          {adminTab === 'posts' && (
            <div>
              <div style={{ fontSize: 11, color: '#555', letterSpacing: 2, fontWeight: 700, marginBottom: 14, ...F }}>전체 게시글 ({adminPosts.length})</div>
              {adminPosts.map(post => {
                const store = adminStores.find(s => s.id === post.store_id)
                return (
                  <div key={post.id} style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 12, padding: '12px 14px', marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 5, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, background: '#141414', borderRadius: 6, padding: '2px 8px', color: '#c8a96e', ...F }}>{(store as any)?.emoji} {store?.name}</span>
                        <span style={{ fontSize: 11, color: '#555', ...F }}>{post.user_name}</span>
                        <span style={{ fontSize: 11, color: '#555' }}>❤️ {post.likes}</span>
                      </div>
                      <div style={{ fontSize: 13, color: '#ccc', lineHeight: 1.5, ...F }}>{post.review}</div>
                      <div style={{ fontSize: 10, color: '#444', marginTop: 4, ...F }}>{new Date(post.created_at).toLocaleString('ko-KR')}</div>
                    </div>
                    <button onClick={() => deletePost(post.id)} style={{ background: '#2a1a1a', border: '1px solid #3a2a2a', color: '#e05a5a', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0, ...F }}>🗑</button>
                  </div>
                )
              })}
              {adminPosts.length === 0 && <div style={{ color: '#444', textAlign: 'center', padding: 40, ...F }}>게시글이 없어요</div>}
            </div>
          )}

          {adminTab === 'users' && stats && (
            <div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                {[
                  { label: '전체', value: stats.users.length },
                  { label: '점주', value: stats.users.filter(u => u.role === 'owner').length, color: '#c8a96e' },
                  { label: '일반', value: stats.users.filter(u => u.role === 'user').length, color: '#888' },
                ].map(item => (
                  <div key={item.label} style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 8, padding: '8px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: item.color || '#f0ece4' }}>{item.value}</div>
                    <div style={{ fontSize: 10, color: '#555', ...F }}>{item.label}</div>
                  </div>
                ))}
              </div>
              {stats.users.map(u => (
                <div key={u.id} style={{ background: '#0d0d0d', border: `1px solid ${u.is_blocked ? '#3a1a1a' : '#1e1e1e'}`, borderRadius: 12, padding: '12px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#161616', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                    {u.role === 'owner' ? '🏪' : '😊'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', ...F }}>
                      {u.nickname}
                      <span style={{ fontSize: 10, background: u.role === 'owner' ? '#c8a96e22' : '#22222255', color: u.role === 'owner' ? '#c8a96e' : '#666', borderRadius: 4, padding: '2px 6px', fontWeight: 700 }}>
                        {u.role === 'owner' ? '점주' : '일반'}
                      </span>
                      {u.is_blocked && <span style={{ fontSize: 10, background: '#3a1a1a', color: '#e05a5a', borderRadius: 4, padding: '2px 6px' }}>차단됨</span>}
                    </div>
                    {u.email && <div style={{ fontSize: 11, color: '#666', marginTop: 2, ...F }}>{u.email}</div>}
                    <div style={{ fontSize: 10, color: '#444', marginTop: 2, ...F }}>{new Date(u.created_at).toLocaleString('ko-KR')} 가입</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => setUserRole(u.id, u.role === 'owner' ? 'user' : 'owner', u.nickname)}
                      style={{ background: u.role === 'owner' ? '#1a1a2a' : '#1a2a1a', border: `1px solid ${u.role === 'owner' ? '#2a2a3a' : '#2a3a2a'}`, color: u.role === 'owner' ? '#888' : '#c8a96e', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', ...F }}>
                      {u.role === 'owner' ? '점주 해제' : '점주 승격'}
                    </button>
                    <button onClick={() => toggleBlock(u.id, !u.is_blocked, u.nickname)} style={{ background: u.is_blocked ? '#1a2a1a' : '#2a1a1a', border: `1px solid ${u.is_blocked ? '#2a3a2a' : '#3a2a2a'}`, color: u.is_blocked ? '#6fcf97' : '#e05a5a', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', ...F }}>
                      {u.is_blocked ? '해제' : '차단'}
                    </button>
                  </div>
                </div>
              ))}
              {stats.users.length === 0 && <div style={{ color: '#444', textAlign: 'center', padding: 40, ...F }}>사용자가 없어요</div>}
            </div>
          )}

          {adminTab === 'categories' && (
            <div>
              <div style={{ fontSize: 11, color: '#555', letterSpacing: 2, fontWeight: 700, marginBottom: 14, ...F }}>먹검색 범용 카테고리 관리</div>
              <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#c8a96e', fontWeight: 700, marginBottom: 10, ...F }}>+ 새 카테고리 추가</div>
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
                      if (json.id) { setFoodCategories(prev => [...prev, json]); setNewCatKo(''); setNewCatEn('') }
                      else alert('오류: ' + JSON.stringify(json))
                    }} style={{ padding: '10px 14px', background: '#c8a96e', color: '#080808', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', ...F }}>
                      추가
                    </button>
                  </div>
                </div>
              </div>
              {(() => {
                if (foodCategories.length === 0) return <div style={{ color: '#444', textAlign: 'center', padding: 40, ...F }}>카테고리가 없어요</div>
                const groups: { key: string; label: string; items: typeof foodCategories }[] = []
                const seen = new Set<string>()
                foodCategories.forEach(fc => {
                  const key = fc.group_ko || ''
                  if (!seen.has(key)) {
                    seen.add(key)
                    groups.push({ key, label: `${fc.group_emoji || ''} ${fc.group_ko || '기타'}`.trim(), items: [] })
                  }
                  groups[groups.findIndex(g => g.key === key)].items.push(fc)
                })
                return groups.map(group => (
                  <div key={group.key} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: '#c8a96e', fontWeight: 700, letterSpacing: 0.5, marginBottom: 8, ...F }}>
                      {group.label}
                    </div>
                    {group.items.map(fc => (
                      <div key={fc.id} style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 10, padding: '10px 14px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, ...F }}>{fc.name_ko}</span>
                          <span style={{ fontSize: 12, color: '#666', marginLeft: 10, ...F }}>{fc.name_en}</span>
                        </div>
                        <button onClick={async () => {
                          if (!confirm(`"${fc.name_ko}" 카테고리를 삭제할까요?`)) return
                          const res = await fetch('/api/food-categories', {
                            method: 'DELETE', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: fc.id })
                          })
                          const json = await res.json()
                          if (json.success) setFoodCategories(prev => prev.filter(c => c.id !== fc.id))
                          else alert('삭제 실패: ' + JSON.stringify(json))
                        }} style={{ background: '#2a1a1a', border: '1px solid #3a2a2a', color: '#e05a5a', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', ...F }}>
                          🗑 삭제
                        </button>
                      </div>
                    ))}
                  </div>
                ))
              })()}
            </div>
          )}
        </>
      )}

      {/* ══════ 점주 UI ══════ */}
      {role === 'owner' && (
        <>
          {editingStore ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid #1a1a1a' }}>
                <button onClick={() => setEditingStore(null)} style={{ background: 'none', border: 'none', color: '#c8a96e', fontSize: 13, fontWeight: 700, cursor: 'pointer', ...F }}>
                  ← 목록
                </button>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#888', ...F }}>{editingStore.name} 메뉴 편집</span>
              </div>
              <MenuEditor store={editingStore} lang={lang} t={t} F={F} onSave={handleSaveStore} />
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#555', letterSpacing: 2, fontWeight: 700, ...F }}>내 가게 ({myStores.length})</div>
                {!showAddStore && (
                  <button onClick={() => setShowAddStore(true)} style={{ background: '#c8a96e', color: '#080808', border: 'none', borderRadius: 10, padding: '7px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', ...F }}>
                    + 새 가게 등록
                  </button>
                )}
              </div>

              {showAddStore && (
                <StoreForm
                  userId={user?.id}
                  onSaved={() => { setShowAddStore(false); if (user) loadMyStores(user.id) }}
                  onCancel={() => setShowAddStore(false)}
                />
              )}

              {!showAddStore && myStores.length === 0 && (
                <div style={{ background: '#0d0d0d', border: '1.5px dashed #1e1e1e', borderRadius: 14, padding: 40, textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🏪</div>
                  <div style={{ fontSize: 14, color: '#555', marginBottom: 16, ...F }}>아직 등록된 가게가 없어요</div>
                  <button onClick={() => setShowAddStore(true)} style={{ background: '#c8a96e', color: '#080808', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', ...F }}>
                    + 가게 등록하기
                  </button>
                </div>
              )}

              {myStores.map(s => (
                <div key={s.id} style={{ background: '#0d0d0d', border: '1px solid #1c1c1c', borderRadius: 14, padding: '16px 18px', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ fontSize: 32 }}>{s.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, ...F }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: '#c8a96e' }}>📍 {s.address}</div>
                    </div>
                    <button onClick={() => setEditingStore(s)} style={{ background: '#c8a96e', border: 'none', color: '#080808', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', ...F }}>
                      ✏️ 메뉴 편집
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  )
}

'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { uploadPostImage } from '@/lib/supabase'
import { T, CAT_ACCENT, type Lang, type Translations } from '@/lib/i18n'
import type { Store, Post, Comment, MainMenuItem } from '@/types'
import StoreRegister from '@/components/StoreRegister'

// ── 헬퍼 ──────────────────────────────────────────────────
function dName(store: Store, koKey: string, lang: Lang) {
  const e = store.menu_names?.[koKey]
  if (!e) return koKey
  return lang === 'en' ? (e.en || koKey) : (e.ko || koKey)
}

function dOptLabel(store: Store, koName: string, key: string, lang: Lang) {
  const opt = store.menu_options?.[koName]?.find(o => o.key === key)
  return lang === 'en' ? (opt?.labelEn || key) : (opt?.labelKo || key)
}

function dChoice(store: Store, koName: string, key: string, koValue: string, lang: Lang) {
  if (lang === 'ko') return koValue
  const opt = store.menu_options?.[koName]?.find(o => o.key === key)
  return opt?.choices.find(c => c.ko === koValue)?.en || koValue
}

function optionBadges(store: Store, koName: string, options: Record<string, string>, lang: Lang) {
  return Object.entries(options)
    .filter(([, v]) => v && v !== '넣지않음')
    .map(([k, v]) => `${dOptLabel(store, koName, k, lang)}: ${dChoice(store, koName, k, v, lang)}`)
}

function buildAutoText(store: Store, mainItems: MainMenuItem[], sideItems: string[], lang: Lang) {
  if (mainItems.length + sideItems.length < 2) return ''
  const t = T[lang]
  const mains = mainItems.map(m => {
    const b = optionBadges(store, m.name, m.options, lang)
    const nm = dName(store, m.name, lang)
    return b.length > 0 ? `${nm}(${b.join(', ')})` : nm
  })
  const sides = sideItems.map(s => dName(store, s, lang))
  const prefix = lang === 'ko' ? (t as typeof T.ko).autoPrefix(store as unknown as { name: string }) : (t as typeof T.en).autoPrefix(store as unknown as { name_en: string })
  return `${prefix} ${[...mains, ...sides].join(' + ')} ${t.autoSuffix}`
}

function defaultOptions(store: Store, menuName: string) {
  const opts = store.menu_options?.[menuName]
  if (!opts) return {}
  return Object.fromEntries(opts.map(o => [o.key, o.choices[0]?.ko || '']))
}

function timeAgo(dateStr: string, lang: Lang) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return lang === 'ko' ? '방금 전' : 'Just now'
  if (m < 60) return lang === 'ko' ? `${m}분 전` : `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return lang === 'ko' ? `${h}시간 전` : `${h}hr ago`
  const d = Math.floor(h / 24)
  return lang === 'ko' ? `${d}일 전` : `${d}d ago`
}

// ── 댓글 섹션 ────────────────────────────────────────────
function CommentSection({ postId, comments, lang, F }: {
  postId: string, comments: Comment[], lang: Lang, F: React.CSSProperties
}) {
  const t = T[lang]
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [list, setList] = useState(comments)

  const submit = async () => {
    if (!text.trim()) return
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, userName: lang === 'ko' ? '나' : 'Me', avatar: '😊', text: text.trim(), textLang: lang }),
      })
      const c = await res.json()
      setList([...list, c])
      setText('')
    } catch { toast.error(t.toastError) }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <button onClick={() => setOpen(o => !o)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#666', fontSize: 12, ...F, display: 'flex', alignItems: 'center', gap: 5 }}>
        {t.commentToggle(list.length, open)}
      </button>
      {open && (
        <div style={{ marginTop: 12 }}>
          {list.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#161616', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{c.avatar}</div>
              <div style={{ background: '#111', borderRadius: 10, padding: '8px 12px', flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#c8a96e', marginBottom: 3, ...F }}>{c.user_name}</div>
                <div style={{ fontSize: 13, color: '#ccc', lineHeight: 1.5, ...F }}>{c.text}</div>
                <div style={{ fontSize: 10, color: '#444', marginTop: 4, ...F }}>{timeAgo(c.created_at, lang)}</div>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#161616', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>😊</div>
            <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder={t.commentPlaceholder}
              style={{ flex: 1, background: '#111', border: '1px solid #222', borderRadius: 20, padding: '7px 14px', color: '#f0ece4', fontSize: 13, outline: 'none', ...F }} />
            <button onClick={submit} style={{ background: text.trim() ? '#c8a96e' : '#1a1a1a', color: text.trim() ? '#080808' : '#444', border: 'none', borderRadius: 20, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: text.trim() ? 'pointer' : 'default', ...F }}>
              {t.commentPost}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 메인 ─────────────────────────────────────────────────
export default function Home() {
  const [lang, setLang] = useState<Lang>('ko')
  const t = T[lang]
  const F: React.CSSProperties = { fontFamily: lang === 'en' ? "'Inter',sans-serif" : "'Noto Sans KR',sans-serif" }

  const [stores, setStores] = useState<Store[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'feed' | 'stores'>('feed')
  const [subView, setSubView] = useState<'list' | 'register' | 'edit'>('list')
  const [filterStoreId, setFilterStoreId] = useState<string | null>(null)
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [showPostForm, setShowPostForm] = useState(false)

  // post form state
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [activeCategory, setActiveCategory] = useState('🍜 메인메뉴')
  const [mainItems, setMainItems] = useState<MainMenuItem[]>([])
  const [sideItems, setSideItems] = useState<string[]>([])
  const [optionPanelFor, setOptionPanelFor] = useState<string | null>(null)
  const [review, setReview] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [sRes, pRes] = await Promise.all([fetch('/api/stores'), fetch('/api/posts')])
    const [s, p] = await Promise.all([sRes.json(), pRes.json()])
    setStores(Array.isArray(s) ? s : [])
    setPosts(Array.isArray(p) ? p : [])
    if (Array.isArray(s) && s.length > 0) setSelectedStore(s[0])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filteredPosts = filterStoreId ? posts.filter(p => p.store_id === filterStoreId) : posts
  const storeOf = (id: string) => stores.find(s => s.id === id) || stores[0]
  const storeName = (s: Store) => lang === 'en' ? s.name_en : s.name
  const storeAddr = (s: Store) => lang === 'en' ? s.address_en : s.address

  const toggleLike = async (post: Post) => {
    const delta = post.likes !== undefined ? (post.likes > 0 ? -1 : 1) : 1
    // optimistic UI
    setPosts(posts.map(p => p.id === post.id ? { ...p, likes: Math.max(0, p.likes + delta) } : p))
    await fetch('/api/posts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: post.id, delta }) })
  }

  const toggleMain = (name: string) => {
    const exists = mainItems.find(m => m.name === name)
    if (exists) { setMainItems(mainItems.filter(m => m.name !== name)); if (optionPanelFor === name) setOptionPanelFor(null) }
    else { const item = { name, options: defaultOptions(selectedStore!, name) }; setMainItems([...mainItems, item]); if (selectedStore?.menu_options?.[name]) setOptionPanelFor(name) }
  }
  const toggleSide = (name: string) => setSideItems(prev => prev.includes(name) ? prev.filter(i => i !== name) : [...prev, name])
  const setOption = (menuName: string, key: string, value: string) =>
    setMainItems(mainItems.map(m => m.name === menuName ? { ...m, options: { ...m.options, [key]: value } } : m))

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setPhotoFile(file)
    setPhoto(URL.createObjectURL(file))
  }

  const handleSubmit = async () => {
    if (!selectedStore || mainItems.length + sideItems.length < 2 || !review.trim()) return
    setSubmitting(true)
    try {
      let photoUrl: string | null = null
      if (photoFile) photoUrl = await uploadPostImage(photoFile)
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: selectedStore.id, userName: lang === 'ko' ? '나' : 'Me', avatar: '😊', items: mainItems, sideItems, review, reviewLang: lang, photoUrl }),
      })
      const newPost = await res.json()
      setPosts([{ ...newPost, comments: [] }, ...posts])
      setMainItems([]); setSideItems([]); setReview(''); setPhoto(null); setPhotoFile(null); setOptionPanelFor(null)
      setShowPostForm(false)
      toast.success(t.toast)
    } catch { toast.error(t.toastError) }
    finally { setSubmitting(false) }
  }

  const saveStoreEdit = async (id: string, name: { ko: string; en: string }, menuNames: Record<string, { ko: string; en: string }>) => {
    const res = await fetch('/api/stores', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: name.ko, nameEn: name.en, menuNames }),
    })
    const updated = await res.json()
    setStores(stores.map(s => s.id === id ? updated : s))
    toast.success(lang === 'ko' ? '저장됐어요 ✓' : 'Saved ✓')
  }

  const isMainCat = activeCategory === '🍜 메인메뉴'
  const totalSelected = mainItems.length + sideItems.length
  const autoText = selectedStore ? buildAutoText(selectedStore, mainItems, sideItems, lang) : ''

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c8a96e', fontSize: 14, ...F }}>
      {t.loading}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: '#f0ece4', maxWidth: 430, margin: '0 auto', ...F }}>
      <Toaster position="top-center" toastOptions={{ style: { background: '#1a1a1a', color: '#f0ece4', border: '1px solid #2a2a2a' } }} />

      {/* ── HEADER ── */}
      <div style={{ background: '#080808', borderBottom: '1px solid #161616', position: 'sticky', top: 0, zIndex: 100, padding: '14px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1 }}>
              <span style={{ color: '#c8a96e' }}>먹</span><span style={{ color: '#f0ece4' }}>+콤보</span>
            </div>
            <div style={{ fontSize: 9, color: '#444', letterSpacing: 3, marginTop: 3, fontWeight: 500, fontFamily: "'Inter',sans-serif" }}>MUK-COMBO</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setLang(l => l === 'ko' ? 'en' : 'ko')} style={{ background: '#141414', border: '1px solid #2a2a2a', borderRadius: 20, padding: '5px 2px', cursor: 'pointer', display: 'flex', alignItems: 'center', width: 56, position: 'relative' }}>
              <div style={{ position: 'absolute', left: lang === 'ko' ? 2 : 28, width: 26, height: 22, background: '#c8a96e', borderRadius: 16, transition: 'left 0.2s' }} />
              {(['ko', 'en'] as Lang[]).map(l => <span key={l} style={{ position: 'relative', zIndex: 1, width: 28, textAlign: 'center', fontSize: 11, fontWeight: 700, color: lang === l ? '#080808' : '#555', fontFamily: "'Inter',sans-serif" }}>{l.toUpperCase()}</span>)}
            </button>
            <button onClick={() => { if (showPostForm) { setShowPostForm(false) } else { setMainItems([]); setSideItems([]); setReview(''); setPhoto(null); setPhotoFile(null); setOptionPanelFor(null); setShowPostForm(true); setTab('feed') } }}
              style={{ background: showPostForm ? '#c8a96e' : 'transparent', border: '1.5px solid #c8a96e', color: showPostForm ? '#080808' : '#c8a96e', borderRadius: 20, padding: '7px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 700, ...F }}>
              {showPostForm ? t.cancelBtn : t.shareBtn}
            </button>
          </div>
        </div>
        {!showPostForm && (
          <div style={{ display: 'flex' }}>
            {(['feed', 'stores'] as const).map(tv => (
              <button key={tv} onClick={() => { setTab(tv); setSubView('list') }} style={{ background: 'none', border: 'none', padding: '8px 18px', color: tab === tv ? '#c8a96e' : '#555', borderBottom: tab === tv ? '2px solid #c8a96e' : '2px solid transparent', fontSize: 13, cursor: 'pointer', fontWeight: tab === tv ? 700 : 400, ...F }}>
                {tv === 'feed' ? t.feed : t.stores}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── STORES TAB ── */}
      {tab === 'stores' && !showPostForm && (
        <>
          {subView === 'list' && (
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#555', letterSpacing: 2, fontWeight: 700 }}>{t.storesTitle.toUpperCase()}</div>
                <button onClick={() => setSubView('register')} style={{ background: '#c8a96e', border: 'none', color: '#080808', borderRadius: 16, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', ...F }}>
                  {t.registerStore}
                </button>
              </div>
              {stores.map(s => (
                <div key={s.id} style={{ background: '#0d0d0d', border: '1px solid #1c1c1c', borderRadius: 14, padding: '16px 18px', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }} onClick={() => { setFilterStoreId(s.id); setTab('feed') }}>
                    <div style={{ fontSize: 32 }}>{s.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{storeName(s)}</div>
                      <div style={{ fontSize: 11, color: '#c8a96e' }}>📍 {storeAddr(s)}</div>
                      <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>{t.storeComboCount(posts.filter(p => p.store_id === s.id).length)}</div>
                    </div>
                    <div style={{ color: '#444', fontSize: 18 }}>›</div>
                  </div>
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #1a1a1a', display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={() => { setEditingStore(s); setSubView('edit') }} style={{ background: '#141414', border: '1px solid #2a2a2a', color: '#888', borderRadius: 8, padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer', ...F }}>
                      ⚙ {t.editTab}
                    </button>
                  </div>
                </div>
              ))}
              {stores.length === 0 && (
                <div style={{ border: '1.5px dashed #1e1e1e', borderRadius: 14, padding: 40, textAlign: 'center', color: '#444', fontSize: 13 }}>
                  {lang === 'ko' ? '등록된 가게가 없어요\n위의 + 버튼으로 추가해보세요' : 'No stores yet.\nClick + to add one'}
                </div>
              )}
            </div>
          )}

          {subView === 'register' && (
            <StoreRegister lang={lang} t={t as Translations} F={F}
              onSaved={(store) => { setStores([...stores, store]); setSubView('list') }}
              onCancel={() => setSubView('list')} />
          )}

          {subView === 'edit' && editingStore && (
            <StoreEditPanel store={editingStore} lang={lang} t={t} F={F}
              onSave={saveStoreEdit}
              onBack={() => { setSubView('list'); setEditingStore(null) }}
              CAT_ACCENT={CAT_ACCENT} />
          )}
        </>
      )}

      {/* ── FEED ── */}
      {tab === 'feed' && !showPostForm && (
        <div style={{ paddingBottom: 60 }}>
          <div style={{ display: 'flex', gap: 8, padding: '12px 20px', overflowX: 'auto', scrollbarWidth: 'none', borderBottom: '1px solid #141414' }}>
            <button onClick={() => setFilterStoreId(null)} style={{ flexShrink: 0, background: !filterStoreId ? '#c8a96e' : '#141414', color: !filterStoreId ? '#080808' : '#666', border: 'none', borderRadius: 16, padding: '5px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 700, ...F }}>{t.allFilter}</button>
            {stores.map(s => (
              <button key={s.id} onClick={() => setFilterStoreId(filterStoreId === s.id ? null : s.id)} style={{ flexShrink: 0, background: filterStoreId === s.id ? '#c8a96e' : '#141414', color: filterStoreId === s.id ? '#080808' : '#666', border: 'none', borderRadius: 16, padding: '5px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 700, ...F }}>{s.emoji} {storeName(s)}</button>
            ))}
          </div>
          {filteredPosts.length === 0 && <div style={{ textAlign: 'center', color: '#444', padding: 60, fontSize: 14 }}>{t.noPost}</div>}
          {filteredPosts.map(post => {
            const store = storeOf(post.store_id)
            if (!store) return null
            return (
              <div key={post.id} style={{ borderBottom: '1px solid #141414', paddingBottom: 20 }}>
                {post.photo_url && <div style={{ width: '100%', aspectRatio: '4/3', overflow: 'hidden' }}><img src={post.photo_url} alt="combo" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /></div>}
                <div style={{ padding: '16px 20px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#161616', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{post.avatar}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{post.user_name}</div>
                      <div style={{ fontSize: 11, color: '#444' }}>{timeAgo(post.created_at, lang)}</div>
                    </div>
                    <div style={{ background: '#141414', borderRadius: 8, padding: '4px 10px', fontSize: 11, color: '#c8a96e', fontWeight: 500 }}>{store.emoji} {storeName(store)}</div>
                  </div>
                  <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 12, padding: '14px 16px', marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: '#c8a96e', letterSpacing: 2, fontWeight: 700, marginBottom: 12 }}>{t.comboLabel}</div>
                    {post.items?.map((m, i) => (
                      <div key={i} style={{ marginBottom: 10 }}>
                        <span style={{ background: '#181818', border: '1px solid #c8a96e33', borderRadius: 6, padding: '4px 11px', fontSize: 13, fontWeight: 700, color: '#c8a96e' }}>{dName(store, m.name, lang)}</span>
                        {(() => { const b = optionBadges(store, m.name, m.options || {}, lang); return b.length > 0 ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6, marginLeft: 4 }}>{b.map((badge, bi) => <span key={bi} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 4, padding: '2px 8px', fontSize: 11, color: '#aaa' }}>{badge}</span>)}</div> : null })()}
                      </div>
                    ))}
                    {post.side_items?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6, paddingTop: 10, borderTop: '1px solid #181818' }}>
                        {post.side_items.map((s, i) => <span key={i} style={{ background: '#181818', border: '1px solid #282828', borderRadius: 6, padding: '4px 11px', fontSize: 12, fontWeight: 500, color: '#ccc' }}>{dName(store, s, lang)}</span>)}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: '#424242', lineHeight: 1.6, borderTop: '1px solid #181818', paddingTop: 10, marginTop: 10 }}>
                      {lang === 'ko' ? `${store.name}에서` : `At ${store.name_en},`}{' '}
                      <span style={{ color: '#c8a96e', fontWeight: 700 }}>
                        {[...(post.items || []).map(m => { const b = optionBadges(store, m.name, m.options || {}, lang); const nm = dName(store, m.name, lang); return b.length > 0 ? `${nm}(${b.join(', ')})` : nm }), ...(post.side_items || []).map(s => dName(store, s, lang))].join(' + ')}
                      </span>{' '}{t.autoSuffix}
                    </div>
                  </div>
                  <p style={{ fontSize: 14, color: '#ccc', lineHeight: 1.75, margin: '0 0 14px', fontFamily: post.review_lang === 'en' ? "'Inter',sans-serif" : "'Noto Sans KR',sans-serif" }}>{post.review}</p>
                  <button onClick={() => toggleLike(post)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: '#484848', fontSize: 13, fontWeight: 700, padding: 0, ...F }}>
                    <span style={{ fontSize: 16 }}>🤍</span>{post.likes}
                  </button>
                  <CommentSection postId={post.id} comments={post.comments || []} lang={lang} F={F} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── POST FORM ── */}
      {showPostForm && (
        <div style={{ padding: '20px 20px 100px' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#c8a96e', marginBottom: 20 }}>{t.formTitle}</div>

          {/* 가게 선택 (여러 가게일 때) */}
          {stores.length > 1 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#555', letterSpacing: 2, fontWeight: 700, marginBottom: 10 }}>STORE</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {stores.map(s => (
                  <button key={s.id} onClick={() => { setSelectedStore(s); setMainItems([]); setSideItems([]) }} style={{ background: selectedStore?.id === s.id ? '#c8a96e' : '#141414', color: selectedStore?.id === s.id ? '#080808' : '#777', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, cursor: 'pointer', fontWeight: selectedStore?.id === s.id ? 700 : 400, ...F }}>{s.emoji} {storeName(s)}</button>
                ))}
              </div>
            </div>
          )}

          {selectedStore && (
            <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 22 }}>{selectedStore.emoji}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{storeName(selectedStore)}</div>
                <a href={selectedStore.map_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#c8a96e' }}>📍 {storeAddr(selectedStore)}</a>
              </div>
            </div>
          )}

          {/* 사진 */}
          <div style={{ fontSize: 11, color: '#555', letterSpacing: 2, fontWeight: 700, marginBottom: 10 }}>{t.step1}</div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
          {photo ? (
            <div style={{ position: 'relative', marginBottom: 20, borderRadius: 12, overflow: 'hidden' }}>
              <img src={photo} alt="preview" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
              <button onClick={() => { setPhoto(null); setPhotoFile(null) }} style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.65)', border: 'none', color: '#f0ece4', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', fontSize: 14 }}>✕</button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} style={{ width: '100%', aspectRatio: '16/9', background: '#0d0d0d', border: '1.5px dashed #252525', borderRadius: 12, color: '#484848', fontSize: 13, cursor: 'pointer', marginBottom: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, ...F }}>
              <span style={{ fontSize: 28 }}>📷</span><span style={{ fontWeight: 500 }}>{t.photoAdd}</span><span style={{ fontSize: 11, color: '#333' }}>{t.photoSub}</span>
            </button>
          )}

          {selectedStore && (
            <>
              {/* 카테고리 */}
              <div style={{ fontSize: 11, color: '#555', letterSpacing: 2, fontWeight: 700, marginBottom: 10 }}>{t.step2}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                {Object.keys(selectedStore.categories || {}).map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} style={{ background: activeCategory === cat ? (CAT_ACCENT[cat] || '#c8a96e') : '#141414', color: activeCategory === cat ? '#080808' : '#666', border: 'none', borderRadius: 16, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontWeight: activeCategory === cat ? 700 : 400, ...F }}>{t.cats[cat as keyof typeof t.cats] || cat}</button>
                ))}
              </div>

              {/* 메뉴 선택 */}
              <div style={{ fontSize: 11, color: '#555', letterSpacing: 2, fontWeight: 700, marginBottom: 10 }}>{t.step3}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 10 }}>
                {(selectedStore.categories[activeCategory] || []).map((item: string) => {
                  const selMain = isMainCat && mainItems.find(m => m.name === item)
                  const selSide = !isMainCat && sideItems.includes(item)
                  const sel = selMain || selSide
                  const accent = CAT_ACCENT[activeCategory] || '#c8a96e'
                  const price = selectedStore.prices?.[item]
                  const hasOpts = isMainCat && selectedStore.menu_options?.[item]
                  return (
                    <button key={item} onClick={() => isMainCat ? toggleMain(item) : toggleSide(item)} style={{ background: sel ? '#0e1a0e' : '#141414', color: sel ? accent : '#888', border: `1.5px solid ${sel ? accent : '#222'}`, borderRadius: 8, padding: '6px 13px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontWeight: sel ? 700 : 400, ...F }}>
                      {sel && <span style={{ fontSize: 10 }}>✓</span>}
                      {dName(selectedStore, item, lang)}
                      {hasOpts && <span style={{ fontSize: 10, color: sel ? accent : '#555' }}>⚙</span>}
                      {price && <span style={{ fontSize: 10, color: sel ? accent : '#484848' }}>{price}₩</span>}
                    </button>
                  )
                })}
              </div>

              {/* 옵션 패널 */}
              {isMainCat && mainItems.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                    {mainItems.map(m => (
                      <button key={m.name} onClick={() => setOptionPanelFor(optionPanelFor === m.name ? null : m.name)} style={{ background: optionPanelFor === m.name ? '#c8a96e' : '#181818', color: optionPanelFor === m.name ? '#080808' : '#c8a96e', border: '1px solid #c8a96e33', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', ...F }}>
                        {dName(selectedStore, m.name, lang)} ⚙
                      </button>
                    ))}
                  </div>
                  {optionPanelFor && (() => {
                    const m = mainItems.find(x => x.name === optionPanelFor)
                    const opts = selectedStore.menu_options?.[optionPanelFor]
                    if (!m || !opts) return null
                    return (
                      <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 12, padding: '14px 16px' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#c8a96e', marginBottom: 12 }}>{t.optionLabel(dName(selectedStore, optionPanelFor, lang))}</div>
                        {opts.map(opt => (
                          <div key={opt.key} style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 11, color: '#888', fontWeight: 500, marginBottom: 7 }}>{lang === 'en' ? opt.labelEn : opt.labelKo}</div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {opt.choices.map(choice => {
                                const active = m.options[opt.key] === choice.ko
                                const isNoneC = choice.ko === '넣지않음'
                                return (
                                  <button key={choice.ko} onClick={() => setOption(optionPanelFor, opt.key, choice.ko)} style={{ background: active ? (isNoneC ? '#1a1a1a' : '#1a2a1a') : '#141414', color: active ? (isNoneC ? '#888' : '#6fcf97') : '#666', border: `1.5px solid ${active ? (isNoneC ? '#333' : '#6fcf97') : '#222'}`, borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontWeight: active ? 700 : 400, ...F }}>
                                    {active && !isNoneC && <span style={{ fontSize: 9, marginRight: 3 }}>✓</span>}
                                    {lang === 'en' ? choice.en : choice.ko}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* 선택 요약 */}
              {totalSelected > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 11, color: '#555', letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>{t.selectedLabel(totalSelected)}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {mainItems.map((m, i) => <span key={i} onClick={() => toggleMain(m.name)} style={{ background: '#141414', border: '1px solid #c8a96e', color: '#c8a96e', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>✕ {dName(selectedStore, m.name, lang)}</span>)}
                    {sideItems.map((s, i) => <span key={i} onClick={() => toggleSide(s)} style={{ background: '#141414', border: '1px solid #6fcf97', color: '#6fcf97', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>✕ {dName(selectedStore, s, lang)}</span>)}
                  </div>
                </div>
              )}

              {/* 자동 문구 */}
              {autoText && (
                <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
                  <div style={{ fontSize: 10, color: '#c8a96e', letterSpacing: 2, fontWeight: 700, marginBottom: 6 }}>{t.autoLabel}</div>
                  <div style={{ fontSize: 12, color: '#666', lineHeight: 1.6 }}>{autoText}</div>
                </div>
              )}

              {/* 리뷰 */}
              {totalSelected >= 2 && (
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 11, color: '#555', letterSpacing: 2, fontWeight: 700, marginBottom: 10 }}>{t.step4(review.length)}</div>
                  <textarea value={review} onChange={e => e.target.value.length <= 60 && setReview(e.target.value)} placeholder={t.reviewPlaceholder}
                    style={{ width: '100%', background: '#0d0d0d', border: `1.5px solid ${review.length > 50 ? '#c8a96e' : '#222'}`, borderRadius: 10, color: '#f0ece4', padding: '12px 14px', fontSize: 14, resize: 'none', height: 80, boxSizing: 'border-box', outline: 'none', lineHeight: 1.6, ...F }} />
                  <div style={{ textAlign: 'right', fontSize: 11, color: review.length > 50 ? '#c8a96e' : '#383838', marginTop: 4 }}>{t.charsLeft(60 - review.length)}</div>
                </div>
              )}
            </>
          )}

          <button onClick={handleSubmit} disabled={totalSelected < 2 || !review.trim() || submitting} style={{ width: '100%', padding: 14, background: totalSelected >= 2 && review.trim() && !submitting ? '#c8a96e' : '#161616', color: totalSelected >= 2 && review.trim() && !submitting ? '#080808' : '#383838', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, letterSpacing: 0.5, cursor: totalSelected >= 2 && review.trim() && !submitting ? 'pointer' : 'not-allowed', ...F }}>
            {submitting ? '업로드 중...' : t.submitBtn}
          </button>
        </div>
      )}
    </div>
  )
}

// ── 가게 편집 패널 (인라인 컴포넌트) ──────────────────────
function StoreEditPanel({ store, lang, t, F, onSave, onBack, CAT_ACCENT }: {
  store: Store, lang: Lang, t: typeof T.ko, F: React.CSSProperties,
  onSave: (id: string, name: { ko: string; en: string }, menuNames: Record<string, { ko: string; en: string }>) => void
  onBack: () => void, CAT_ACCENT: Record<string, string>
}) {
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(store.menu_names || {})))
  const [storeName, setStoreName] = useState({ ko: store.name, en: store.name_en })
  const [saved, setSaved] = useState(false)
  const [section, setSection] = useState<'store' | 'menu'>('store')

  const handleSave = () => {
    onSave(store.id, storeName, draft)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ padding: '20px 20px 100px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#c8a96e', fontSize: 13, fontWeight: 700, cursor: 'pointer', ...F }}>{t.backBtn}</button>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#888', ...F }}>{lang === 'ko' ? store.name : store.name_en}</span>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {(['store', 'menu'] as const).map(k => (
          <button key={k} onClick={() => setSection(k)} style={{ background: section === k ? '#c8a96e' : '#141414', color: section === k ? '#080808' : '#666', border: 'none', borderRadius: 16, padding: '7px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer', ...F }}>
            {k === 'store' ? (lang === 'ko' ? '가게명' : 'Store Name') : (lang === 'ko' ? '메뉴명' : 'Menu Names')}
          </button>
        ))}
      </div>
      {section === 'store' && (
        <div>
          {[['ko', `🇰🇷 ${t.koName}`], ['en', `🇺🇸 ${t.enName}`]].map(([lk, label]) => (
            <div key={lk} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 6, ...F }}>{label}</div>
              <input value={storeName[lk as 'ko' | 'en']} onChange={e => setStoreName({ ...storeName, [lk]: e.target.value })}
                style={{ width: '100%', background: '#0d0d0d', border: '1.5px solid #2a2a2a', borderRadius: 8, padding: '10px 14px', color: '#f0ece4', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: lk === 'ko' ? "'Noto Sans KR',sans-serif" : "'Inter',sans-serif" }} />
            </div>
          ))}
        </div>
      )}
      {section === 'menu' && (
        <div>
          <p style={{ fontSize: 11, color: '#484848', marginBottom: 18, ...F }}>{t.editMenuSub}</p>
          {Object.entries(store.categories || {}).map(([cat, items]) => (
            (items as string[]).length > 0 && (
              <div key={cat} style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, color: CAT_ACCENT[cat] || '#c8a96e', fontWeight: 700, letterSpacing: 1, marginBottom: 10, ...F }}>{t.cats[cat as keyof typeof t.cats] || cat}</div>
                {(items as string[]).map(koKey => (
                  <div key={koKey} style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 10, color: '#666', marginBottom: 4, ...F }}>🇰🇷 {t.koName}</div>
                        <input value={draft[koKey]?.ko || ''} onChange={e => setDraft({ ...draft, [koKey]: { ...(draft[koKey] || {}), ko: e.target.value } })}
                          style={{ width: '100%', background: '#141414', border: '1px solid #222', borderRadius: 6, padding: '6px 10px', color: '#f0ece4', fontSize: 12, outline: 'none', boxSizing: 'border-box', fontFamily: "'Noto Sans KR',sans-serif" }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: '#666', marginBottom: 4, ...F }}>🇺🇸 {t.enName}</div>
                        <input value={draft[koKey]?.en || ''} onChange={e => setDraft({ ...draft, [koKey]: { ...(draft[koKey] || {}), en: e.target.value } })}
                          style={{ width: '100%', background: '#141414', border: '1.5px solid #2a2a2a', borderRadius: 6, padding: '6px 10px', color: '#c8a96e', fontSize: 12, outline: 'none', boxSizing: 'border-box', fontFamily: "'Inter',sans-serif" }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ))}
        </div>
      )}
      <button onClick={handleSave} style={{ position: 'sticky', bottom: 20, width: '100%', padding: 14, background: saved ? '#2a4a2a' : '#c8a96e', color: saved ? '#6fcf97' : '#080808', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'background 0.3s', ...F }}>
        {saved ? (lang === 'ko' ? '✓ 저장됨!' : '✓ Saved!') : t.saveBtn}
      </button>
    </div>
  )
}

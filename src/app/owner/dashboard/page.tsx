'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import MenuEditor from '@/components/MenuEditor'
import { T, type Lang, type Translations } from '@/lib/i18n'
import type { Store } from '@/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const F: React.CSSProperties = { fontFamily: "'Noto Sans KR', sans-serif" }

export default function OwnerDashboard() {
  const [user, setUser] = useState<{ id: string; email: string; name?: string } | null>(null)
  const [stores, setStores] = useState<Store[]>([])
  const [allStores, setAllStores] = useState<Store[]>([])
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
  const [claimCode, setClaimCode] = useState('')
  const [claimMsg, setClaimMsg] = useState('')
  const [tab, setTab] = useState<'mystores' | 'claim'>('mystores')
  const lang: Lang = 'ko'
  const t = T[lang]

  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap'
    document.head.appendChild(link)

    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/owner'; return }
      const u = data.session.user
      setUser({ id: u.id, email: u.email || '', name: u.user_metadata?.name })
      loadMyStores(u.id)
      loadAllStores()
    })
  }, [])

  const loadMyStores = useCallback(async (userId: string) => {
    setLoading(true)
    const res = await fetch(`/api/owner?user_id=${userId}`)
    const data = await res.json()
    setStores(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  const loadAllStores = async () => {
    const res = await fetch('/api/stores')
    const data = await res.json()
    setAllStores(Array.isArray(data) ? data : [])
  }

  const handleClaim = async () => {
    if (!user || !claimCode.trim()) return
    setClaimMsg('')
    // storeId로 직접 연결
    const res = await fetch('/api/owner', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, storeId: claimCode.trim() })
    })
    const json = await res.json()
    if (json.success) {
      setClaimMsg(`✅ "${json.storeName}" 가게가 연결됐어요!`)
      setClaimCode('')
      loadMyStores(user.id)
      setTab('mystores')
    } else {
      setClaimMsg(`❌ ${json.error}`)
    }
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
    setStores(stores.map(s => s.id === saved.id ? saved : s))
    setEditingStore(null)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/owner'
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c8a96e', ...F }}>
      불러오는 중...
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: '#f0ece4', ...F }}>
      {/* 헤더 */}
      <div style={{ background: '#0d0d0d', borderBottom: '1px solid #161616', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900 }}><span style={{ color: '#c8a96e' }}>먹</span>+콤보</div>
          <div style={{ fontSize: 11, color: '#c8a96e', marginTop: 2 }}>점주 대시보드</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 12, color: '#888' }}>
            {user?.name || user?.email}
          </div>
          <button onClick={handleLogout} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888', borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer', ...F }}>
            로그아웃
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: 24 }}>
        {/* 편집 중이면 에디터 표시 */}
        {editingStore ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #1a1a1a' }}>
              <button onClick={() => setEditingStore(null)} style={{ background: 'none', border: 'none', color: '#c8a96e', fontSize: 13, fontWeight: 700, cursor: 'pointer', ...F }}>
                ← 목록
              </button>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#888' }}>{editingStore.name} 메뉴 편집</span>
            </div>
            <MenuEditor store={editingStore} lang={lang} t={t as Translations} F={F} onSave={handleSaveStore} />
          </div>
        ) : (
          <>
            {/* 탭 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              {([['mystores', '🏪 내 가게'], ['claim', '+ 가게 연결']] as const).map(([k, label]) => (
                <button key={k} onClick={() => setTab(k)}
                  style={{ background: tab === k ? '#c8a96e' : '#141414', color: tab === k ? '#080808' : '#888', border: 'none', borderRadius: 16, padding: '7px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', ...F }}>
                  {label}
                </button>
              ))}
            </div>

            {/* 내 가게 목록 */}
            {tab === 'mystores' && (
              <div>
                <div style={{ fontSize: 12, color: '#555', letterSpacing: 2, fontWeight: 700, marginBottom: 16 }}>내 가게 ({stores.length})</div>
                {stores.length === 0 ? (
                  <div style={{ background: '#0d0d0d', border: '1.5px dashed #1e1e1e', borderRadius: 14, padding: 40, textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>🏪</div>
                    <div style={{ fontSize: 14, color: '#555', marginBottom: 16 }}>아직 연결된 가게가 없어요</div>
                    <button onClick={() => setTab('claim')} style={{ background: '#c8a96e', color: '#080808', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', ...F }}>
                      + 가게 연결하기
                    </button>
                  </div>
                ) : (
                  stores.map(s => (
                    <div key={s.id} style={{ background: '#0d0d0d', border: '1px solid #1c1c1c', borderRadius: 14, padding: '16px 18px', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ fontSize: 32 }}>{s.emoji}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: '#c8a96e' }}>📍 {s.address}</div>
                        </div>
                        <button onClick={() => setEditingStore(s)}
                          style={{ background: '#c8a96e', border: 'none', color: '#080808', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', ...F }}>
                          ✏️ 메뉴 편집
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 가게 연결 */}
            {tab === 'claim' && (
              <div>
                <div style={{ fontSize: 12, color: '#555', letterSpacing: 2, fontWeight: 700, marginBottom: 16 }}>가게 연결하기</div>
                <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 14, padding: 20, marginBottom: 20 }}>
                  <div style={{ fontSize: 13, color: '#888', marginBottom: 16, lineHeight: 1.6 }}>
                    아래 목록에서 본인 가게의 ID를 확인하고 입력하세요.<br/>
                    어드민에게 요청하여 가게를 먼저 등록받아야 해요.
                  </div>
                  <input value={claimCode} onChange={e => setClaimCode(e.target.value)}
                    placeholder="가게 ID 입력 (예: 85fea5b1-...)"
                    style={{ width: '100%', background: '#141414', border: '1px solid #2a2a2a', borderRadius: 8, padding: '10px 14px', color: '#f0ece4', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 12, ...F }} />
                  {claimMsg && (
                    <div style={{ fontSize: 12, color: claimMsg.startsWith('✅') ? '#6fcf97' : '#e05a5a', marginBottom: 12 }}>{claimMsg}</div>
                  )}
                  <button onClick={handleClaim} style={{ width: '100%', padding: 12, background: '#c8a96e', color: '#080808', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', ...F }}>
                    연결하기
                  </button>
                </div>

                {/* 등록된 가게 목록 (owner 없는 것만) */}
                <div style={{ fontSize: 12, color: '#555', letterSpacing: 2, fontWeight: 700, marginBottom: 12 }}>등록된 가게 목록</div>
                {allStores.filter(s => !s.owner_id).map(s => (
                  <div key={s.id} style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 22 }}>{s.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{s.name}</div>
                        <div style={{ fontSize: 10, color: '#555', marginTop: 2, fontFamily: "'Inter', monospace" }}>{s.id}</div>
                      </div>
                      <button onClick={() => setClaimCode(s.id)}
                        style={{ background: '#141414', border: '1px solid #2a2a2a', color: '#888', borderRadius: 6, padding: '5px 10px', fontSize: 11, cursor: 'pointer', ...F }}>
                        선택
                      </button>
                    </div>
                  </div>
                ))}
                {allStores.filter(s => !s.owner_id).length === 0 && (
                  <div style={{ color: '#444', fontSize: 13, textAlign: 'center', padding: 20 }}>연결 가능한 가게가 없어요</div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

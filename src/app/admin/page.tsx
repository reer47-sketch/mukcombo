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

interface Stats {
  storeCount: number
  postCount: number
  userCount: number
  stores: { id: string; name: string }[]
  posts: { id: string; store_id: string; likes: number; created_at: string }[]
  users: { id: string; nickname: string; is_blocked: boolean; created_at: string }[]
}

export default function AdminPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'stores' | 'posts' | 'users'>('overview')
  const [stores, setStores] = useState<{ id: string; name: string; name_en: string; emoji: string }[]>([])
  const [posts, setPosts] = useState<{ id: string; store_id: string; user_name: string; review: string; likes: number; created_at: string }[]>([])
  const [creds, setCreds] = useState({ username: '', password: '' })

  const loadStats = useCallback(async (u: string, p: string) => {
    const res = await fetch('/api/admin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stats', username: u, password: p })
    })
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

  useEffect(() => {
    if (loggedIn) {
      loadStats(creds.username, creds.password)
      loadStores()
      loadPosts()
    }
  }, [loggedIn, creds, loadStats, loadStores, loadPosts])

  const handleLogin = async () => {
    setLoading(true); setLoginError('')
    const res = await fetch('/api/admin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', username, password })
    })
    const json = await res.json()
    if (json.success) {
      setCreds({ username, password })
      setLoggedIn(true)
    } else {
      setLoginError(json.error)
    }
    setLoading(false)
  }

  const deleteStore = async (storeId: string, storeName: string) => {
    if (!confirm(`"${storeName}" 가게를 삭제할까요?\n연결된 게시글도 모두 삭제됩니다.`)) return
    const res = await fetch('/api/admin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deleteStore', storeId, ...creds })
    })
    const json = await res.json()
    if (json.success) {
      setStores(stores.filter(s => s.id !== storeId))
      alert('삭제됐어요!')
    } else alert('삭제 실패: ' + json.error)
  }

  const deletePost = async (postId: string) => {
    if (!confirm('이 게시글을 삭제할까요?')) return
    const res = await fetch('/api/admin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deletePost', postId, ...creds })
    })
    const json = await res.json()
    if (json.success) {
      setPosts(posts.filter(p => p.id !== postId))
      alert('삭제됐어요!')
    } else alert('삭제 실패: ' + json.error)
  }

  const toggleBlock = async (userId: string, blocked: boolean, nickname: string) => {
    if (!confirm(`"${nickname}" 사용자를 ${blocked ? '차단' : '차단 해제'}할까요?`)) return
    const res = await fetch('/api/admin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'blockUser', userId, blocked, ...creds })
    })
    const json = await res.json()
    if (json.success) {
      setStats(prev => prev ? {
        ...prev,
        users: prev.users.map(u => u.id === userId ? { ...u, is_blocked: blocked } : u)
      } : prev)
    }
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
          <input value={username} onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="admin" style={inp} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>비밀번호</div>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="••••••••" style={inp} />
        </div>
        {loginError && <div style={{ fontSize: 12, color: '#e05a5a', marginBottom: 12, textAlign: 'center' }}>{loginError}</div>}
        <button onClick={handleLogin} disabled={loading}
          style={{ width: '100%', padding: 12, background: '#c8a96e', color: '#080808', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', ...F }}>
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </div>
    </div>
  )

  // ── 대시보드 ──
  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: '#f0ece4', ...F }}>
      {/* 헤더 */}
      <div style={{ background: '#0d0d0d', borderBottom: '1px solid #161616', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: 18, fontWeight: 900 }}><span style={{ color: '#c8a96e' }}>먹</span>+콤보</span>
          <span style={{ fontSize: 11, color: '#c8a96e', marginLeft: 10, fontWeight: 700 }}>ADMIN</span>
        </div>
        <button onClick={() => setLoggedIn(false)}
          style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888', borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer', ...F }}>
          로그아웃
        </button>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
        {/* 탭 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {tab('overview', '📊 개요')}
          {tab('stores', '🏪 가게')}
          {tab('posts', '📝 게시글')}
          {tab('users', '👥 사용자')}
        </div>

        {/* 개요 */}
        {activeTab === 'overview' && stats && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
              {[
                { label: '등록 가게', value: stats.storeCount, color: '#c8a96e' },
                { label: '전체 게시글', value: stats.postCount, color: '#6fcf97' },
                { label: '전체 사용자', value: stats.userCount, color: '#56ccf2' },
              ].map(item => (
                <div key={item.label} style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 12, padding: '20px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 900, color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{item.label}</div>
                </div>
              ))}
            </div>

            {/* 가게별 게시글 */}
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
                      <div style={{ height: '100%', width: `${(count / max) * 100}%`, background: '#c8a96e', borderRadius: 3, transition: 'width 0.5s' }} />
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
            <div style={{ fontSize: 12, color: '#555', letterSpacing: 2, fontWeight: 700, marginBottom: 16 }}>등록된 가게 ({stores.length})</div>
            {stores.map(s => (
              <div key={s.id} style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 12, padding: '16px 18px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 28 }}>{s.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{s.name_en}</div>
                  <div style={{ fontSize: 11, color: '#6fcf97', marginTop: 2 }}>
                    게시글 {posts.filter(p => p.store_id === s.id).length}개
                  </div>
                </div>
                <button onClick={() => deleteStore(s.id, s.name)}
                  style={{ background: '#2a1a1a', border: '1px solid #3a2a2a', color: '#e05a5a', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', ...F }}>
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
                    <div style={{ fontSize: 10, color: '#444', marginTop: 4 }}>
                      {new Date(post.created_at).toLocaleString('ko-KR')}
                    </div>
                  </div>
                  <button onClick={() => deletePost(post.id)}
                    style={{ background: '#2a1a1a', border: '1px solid #3a2a2a', color: '#e05a5a', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0, ...F }}>
                    🗑
                  </button>
                </div>
              )
            })}
            {posts.length === 0 && <div style={{ color: '#444', textAlign: 'center', padding: 40 }}>게시글이 없어요</div>}
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
                  <div style={{ fontSize: 10, color: '#444', marginTop: 2 }}>
                    {new Date(user.created_at).toLocaleString('ko-KR')} 가입
                  </div>
                </div>
                <button onClick={() => toggleBlock(user.id, !user.is_blocked, user.nickname)}
                  style={{ background: user.is_blocked ? '#1a2a1a' : '#2a1a1a', border: `1px solid ${user.is_blocked ? '#2a3a2a' : '#3a2a2a'}`, color: user.is_blocked ? '#6fcf97' : '#e05a5a', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', ...F }}>
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

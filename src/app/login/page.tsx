'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const F: React.CSSProperties = { fontFamily: "'Noto Sans KR', sans-serif" }
const inp: React.CSSProperties = {
  width: '100%', background: '#141414', border: '1px solid #2a2a2a',
  borderRadius: 8, padding: '10px 14px', color: '#f0ece4', fontSize: 14,
  outline: 'none', boxSizing: 'border-box', fontFamily: "'Noto Sans KR', sans-serif"
}

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    // 이미 로그인된 경우 대시보드로
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.href = '/dashboard'
    })

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap'
    document.head.appendChild(link)
  }, [])

  const handleEmailAuth = async () => {
    setLoading(true); setError(''); setMessage('')
    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { name }, emailRedirectTo: `${window.location.origin}/dashboard` }
      })
      if (error) setError(error.message)
      else setMessage('이메일을 확인해주세요! 인증 링크를 보내드렸어요 📧')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError('이메일 또는 비밀번호가 틀렸어요')
      else window.location.href = '/dashboard'
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
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, ...F }}>
      <div style={{ width: '100%', maxWidth: 380, background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 20, padding: 32 }}>
        {/* 로고 */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-1px', color: '#f0ece4' }}>
            <span style={{ color: '#c8a96e' }}>먹</span>+콤보
          </div>
          <div style={{ fontSize: 11, color: '#555', letterSpacing: 3, marginTop: 4 }}>로그인</div>
        </div>

        {/* 탭 */}
        <div style={{ display: 'flex', background: '#141414', borderRadius: 10, padding: 4, marginBottom: 24 }}>
          {(['login', 'signup'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); setMessage('') }}
              style={{ flex: 1, padding: '8px', background: mode === m ? '#c8a96e' : 'transparent', color: mode === m ? '#080808' : '#666', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', ...F }}>
              {m === 'login' ? '로그인' : '회원가입'}
            </button>
          ))}
        </div>

        {/* 구글 로그인 */}
        <button onClick={handleGoogle}
          style={{ width: '100%', padding: '11px', background: '#fff', color: '#333', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16, ...F }}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.9 29.5 5 24 5 12.4 5 3 14.4 3 26s9.4 21 21 21 21-9.4 21-21c0-1.3-.2-2.6-.4-3.9z"/>
            <path fill="#FF3D00" d="M6.3 15.5l6.6 4.8C14.7 16.5 19 14 24 14c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 8.9 29.5 7 24 7 16.3 7 9.7 11.3 6.3 15.5z"/>
            <path fill="#4CAF50" d="M24 43c5.2 0 10-1.9 13.6-5l-6.3-5.3C29.5 34.6 26.9 35.5 24 35.5c-5.3 0-9.7-3.3-11.3-8.1l-6.6 5.1C9.6 38.5 16.3 43 24 43z"/>
            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.3 5.3C40.8 35.7 45 30.3 45 24c0-1.3-.2-2.6-.4-3.9z"/>
          </svg>
          Google로 {mode === 'login' ? '로그인' : '가입'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: '#1e1e1e' }} />
          <span style={{ fontSize: 11, color: '#444' }}>또는</span>
          <div style={{ flex: 1, height: 1, background: '#1e1e1e' }} />
        </div>

        {/* 이름 (회원가입만) */}
        {mode === 'signup' && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>이름</div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="홍길동" style={inp} />
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>이메일</div>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleEmailAuth()}
            placeholder="email@example.com" style={inp} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>비밀번호</div>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleEmailAuth()}
            placeholder="8자 이상" style={inp} />
        </div>

        {error && <div style={{ fontSize: 12, color: '#e05a5a', marginBottom: 12, textAlign: 'center' }}>{error}</div>}
        {message && <div style={{ fontSize: 12, color: '#6fcf97', marginBottom: 12, textAlign: 'center' }}>{message}</div>}

        <button onClick={handleEmailAuth} disabled={loading}
          style={{ width: '100%', padding: 12, background: '#c8a96e', color: '#080808', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', ...F }}>
          {loading ? '처리 중...' : mode === 'login' ? '로그인' : '가입하기'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <a href="/" style={{ fontSize: 12, color: '#555', textDecoration: 'none' }}>← 앱으로 돌아가기</a>
        </div>
      </div>
    </div>
  )
}

'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  lang: 'ko' | 'en'
  onClose?: () => void
}

export default function LoginModal({ lang, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const F: React.CSSProperties = { fontFamily: lang === 'en' ? "'Inter',sans-serif" : "'Noto Sans KR',sans-serif" }

  const handleGoogleLogin = async () => {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20 }}>
      <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 20, padding: 32, width: '100%', maxWidth: 340, ...F }}>
        {/* 로고 */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-1px' }}>
            <span style={{ color: '#c8a96e' }}>먹</span><span style={{ color: '#f0ece4' }}>+콤보</span>
          </div>
          <div style={{ fontSize: 9, color: '#444', letterSpacing: 3, marginTop: 3, fontFamily: "'Inter',sans-serif" }}>MUK-COMBO</div>
        </div>

        <div style={{ fontSize: 15, fontWeight: 700, color: '#f0ece4', marginBottom: 6, textAlign: 'center' }}>
          {lang === 'ko' ? '로그인이 필요해요' : 'Sign in required'}
        </div>
        <div style={{ fontSize: 12, color: '#555', marginBottom: 24, textAlign: 'center', lineHeight: 1.6 }}>
          {lang === 'ko' ? '피드 공유와 오리파 뽑기에\n구글 계정이 필요해요' : 'Google account required\nfor feed and oripa lottery'}
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: '100%', padding: '13px 16px', background: '#fff', color: '#1a1a1a',
            border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 10, ...F,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          {loading ? '...' : lang === 'ko' ? 'Google로 계속하기' : 'Continue with Google'}
        </button>

        {onClose && (
          <button
            onClick={onClose}
            style={{ width: '100%', marginTop: 12, padding: '10px', background: 'transparent', color: '#555', border: 'none', borderRadius: 10, fontSize: 13, cursor: 'pointer', ...F }}
          >
            {lang === 'ko' ? '나중에 하기' : 'Maybe later'}
          </button>
        )}
      </div>
    </div>
  )
}

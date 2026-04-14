'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// OAuth / 이메일 인증 콜백
// - Google OAuth (PKCE): ?code=... → exchangeCodeForSession
// - 이메일 인증 (implicit): #access_token=... → getSession으로 감지
export default function AuthCallbackPage() {
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')
    const hash = window.location.hash

    if (code) {
      // Google OAuth 또는 이메일 PKCE 플로우
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        window.location.href = error ? '/login' : '/?tab=manage'
      })
    } else if (hash.includes('access_token')) {
      // 이메일 인증 implicit 플로우 — Supabase 클라이언트가 hash를 자동 파싱
      supabase.auth.getSession().then(({ data }) => {
        window.location.href = data.session ? '/?tab=manage' : '/login'
      })
    } else {
      window.location.href = '/login'
    }
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c8a96e', fontFamily: "'Noto Sans KR', sans-serif" }}>
      로그인 처리 중...
    </div>
  )
}

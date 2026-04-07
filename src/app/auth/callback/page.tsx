'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// Google OAuth 콜백 — 클라이언트에서 code를 처리해야 localStorage에 세션이 저장됨
export default function AuthCallbackPage() {
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        window.location.href = error ? '/login' : '/dashboard'
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

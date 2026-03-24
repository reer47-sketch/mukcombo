'use client'
import { useState } from 'react'

interface Props {
  onConfirm: (nickname: string, userId: string) => void
  lang: 'ko' | 'en'
}

const uid = () => `user_${Math.random().toString(36).slice(2, 10)}`

export default function NicknamePopup({ onConfirm, lang }: Props) {
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const F: React.CSSProperties = { fontFamily: lang === 'en' ? "'Inter',sans-serif" : "'Noto Sans KR',sans-serif" }

  const handleConfirm = async () => {
    const trimmed = nickname.trim()
    if (!trimmed) {
      setError(lang === 'ko' ? '닉네임을 입력해주세요' : 'Please enter a nickname')
      return
    }
    if (trimmed.length < 2) {
      setError(lang === 'ko' ? '2자 이상 입력해주세요' : 'At least 2 characters')
      return
    }
    if (trimmed.length > 12) {
      setError(lang === 'ko' ? '12자 이하로 입력해주세요' : 'Max 12 characters')
      return
    }

    setLoading(true)
    const userId = uid()

    try {
      // Supabase users 테이블에 저장
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, nickname: trimmed }),
      })
      // localStorage에 저장
      localStorage.setItem('mukcombo_user', JSON.stringify({ id: userId, nickname: trimmed }))
      onConfirm(trimmed, userId)
    } catch {
      // API 실패해도 로컬에만 저장하고 진행
      localStorage.setItem('mukcombo_user', JSON.stringify({ id: userId, nickname: trimmed }))
      onConfirm(trimmed, userId)
    }
    setLoading(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20 }}>
      <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 20, padding: 32, width: '100%', maxWidth: 340, ...F }}>
        {/* 로고 */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-1px' }}>
            <span style={{ color: '#c8a96e' }}>먹</span><span style={{ color: '#f0ece4' }}>+콤보</span>
          </div>
          <div style={{ fontSize: 9, color: '#444', letterSpacing: 3, marginTop: 3, fontFamily: "'Inter',sans-serif" }}>MUK-COMBO</div>
        </div>

        <div style={{ fontSize: 15, fontWeight: 700, color: '#f0ece4', marginBottom: 6, textAlign: 'center' }}>
          {lang === 'ko' ? '닉네임을 입력해주세요' : 'Enter your nickname'}
        </div>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 20, textAlign: 'center' }}>
          {lang === 'ko' ? '피드에서 사용할 이름이에요 (2~12자)' : 'This name will appear on your posts (2–12 chars)'}
        </div>

        <input
          value={nickname}
          onChange={e => { setNickname(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && handleConfirm()}
          placeholder={lang === 'ko' ? '예: 라멘헌터' : 'e.g. RamenHunter'}
          maxLength={12}
          autoFocus
          style={{ width: '100%', background: '#141414', border: `1.5px solid ${error ? '#e05a5a' : '#2a2a2a'}`, borderRadius: 10, padding: '12px 14px', color: '#f0ece4', fontSize: 15, outline: 'none', boxSizing: 'border-box', textAlign: 'center', ...F }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, marginBottom: 16 }}>
          <span style={{ fontSize: 11, color: '#e05a5a' }}>{error}</span>
          <span style={{ fontSize: 11, color: nickname.length > 10 ? '#c8a96e' : '#444' }}>{nickname.length}/12</span>
        </div>

        <button onClick={handleConfirm} disabled={loading}
          style={{ width: '100%', padding: 13, background: '#c8a96e', color: '#080808', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', ...F }}>
          {loading ? '...' : lang === 'ko' ? '시작하기 🎉' : 'Get Started 🎉'}
        </button>
      </div>
    </div>
  )
}

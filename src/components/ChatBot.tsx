'use client'
import { useState, useEffect, useRef } from 'react'
import type { Store, Post } from '@/types'

type Lang = 'ko' | 'en'

interface RecommendCard {
  store: Store
  totalLikes: number
  topReview: string
  isPremium: boolean
}

interface Message {
  from: 'bot' | 'user'
  text: string
  options?: { label: string; value: string }[]
  cards?: RecommendCard[]
}

const F: React.CSSProperties = { fontFamily: "'Noto Sans KR', sans-serif" }

const MENU_OPTS = [
  { label: '🍜 라멘/우동', value: 'ramen', kw: ['라멘', '우동', '소바', '아부라'] },
  { label: '🥟 교자/만두', value: 'gyoza', kw: ['교자', '만두'] },
  { label: '🍚 밥류', value: 'rice', kw: ['밥', '고항', '덮밥'] },
  { label: '🍺 음료/주류', value: 'drink', kw: ['콜라', '맥주', '라무네', '차', '스프라이트', '팹시'] },
  { label: '아무거나', value: 'any', kw: [] },
]

const GROUP_OPTS = [
  { label: '혼자', value: '1' },
  { label: '2명', value: '2' },
  { label: '3~4명', value: '3-4' },
  { label: '5명+', value: '5+' },
]

const TIME_OPTS = [
  { label: '☀️ 점심', value: 'lunch' },
  { label: '🌆 저녁', value: 'dinner' },
  { label: '🌙 야식', value: 'late' },
  { label: '상관없어요', value: 'any' },
]

function getRecommendations(stores: Store[], posts: Post[], menuVal: string): RecommendCard[] {
  const menuOpt = MENU_OPTS.find(m => m.value === menuVal)
  const kw = menuOpt?.kw || []

  let filtered = stores
  if (kw.length > 0) {
    const matched = stores.filter(s =>
      Object.keys(s.menu_names || {}).some(k => kw.some(w => k.includes(w)))
    )
    if (matched.length > 0) filtered = matched
  }

  const cards: RecommendCard[] = filtered.map(store => {
    const storePosts = posts.filter(p => p.store_id === store.id)
    const totalLikes = storePosts.reduce((sum, p) => sum + (p.likes || 0), 0)
    const topPost = [...storePosts].sort((a, b) => b.likes - a.likes)[0]
    return {
      store,
      totalLikes,
      topReview: topPost?.review || '',
      isPremium: !!(store as any).is_premium,
    }
  })

  cards.sort((a, b) => {
    if (a.isPremium && !b.isPremium) return -1
    if (!a.isPremium && b.isPremium) return 1
    return b.totalLikes - a.totalLikes
  })

  return cards.slice(0, 3)
}

const INIT_MESSAGES: Message[] = [
  {
    from: 'bot',
    text: '안녕하세요! 🍜\n딱 맞는 맛집을 찾아드릴게요.\n몇 가지 질문할게요!',
    options: [{ label: '시작하기 →', value: 'start' }],
  },
]

export default function ChatBot({ lang }: { lang: Lang }) {
  const [stores, setStores] = useState<Store[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [messages, setMessages] = useState<Message[]>(INIT_MESSAGES)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [typing, setTyping] = useState(false)
  const [done, setDone] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/stores').then(r => r.json()),
      fetch('/api/posts').then(r => r.json()),
    ]).then(([s, p]) => {
      setStores(Array.isArray(s) ? s : [])
      setPosts(Array.isArray(p) ? p : [])
    })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  const botSay = (text: string, options?: Message['options'], cards?: Message['cards']) => {
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      setMessages(prev => [...prev, { from: 'bot', text, options, cards }])
    }, 650)
  }

  const handleOption = (label: string, value: string) => {
    if (typing || done) return
    setMessages(prev => [...prev, { from: 'user', text: label }])
    const next = { ...answers }

    if (step === 0) {
      botSay('몇 분이서 드실 예정인가요?', GROUP_OPTS)
      setStep(1)
    } else if (step === 1) {
      next.group = value
      setAnswers(next)
      botSay('언제 드실 예정인가요?', TIME_OPTS)
      setStep(2)
    } else if (step === 2) {
      next.time = value
      setAnswers(next)
      botSay('어떤 음식이 끌리세요?', MENU_OPTS.map(m => ({ label: m.label, value: m.value })))
      setStep(3)
    } else if (step === 3) {
      next.menu = value
      setAnswers(next)
      const cards = getRecommendations(stores, posts, value)
      const groupTxt = next.group === '1' ? '혼자' : `${next.group}명`
      const timeTxt: Record<string, string> = { lunch: '점심', dinner: '저녁', late: '야식', any: '' }
      const intro = `${groupTxt}${timeTxt[next.time] ? ` ${timeTxt[next.time]}` : ''} 추천 맛집이에요! 🎉`
      botSay(intro, undefined, cards)
      setStep(4)
      setDone(true)
    }
  }

  const reset = () => {
    setMessages(INIT_MESSAGES)
    setStep(0)
    setAnswers({})
    setDone(false)
  }

  const isLastMsg = (i: number) => i === messages.length - 1

  return (
    <div style={{ padding: '0 20px 20px', ...F }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#f0ece4', marginBottom: 4, ...F }}>
        {lang === 'ko' ? '🤖 맞춤 맛집 추천' : '🤖 Personalized Recommendation'}
      </div>
      <div style={{ fontSize: 11, color: '#555', marginBottom: 12, ...F }}>
        {lang === 'ko' ? '질문에 답하면 딱 맞는 맛집을 찾아드려요' : 'Answer a few questions to get your perfect match'}
      </div>

      <div style={{ background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 16, padding: '16px 12px', maxHeight: 440, overflowY: 'auto' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            {/* 버블 */}
            <div style={{ display: 'flex', justifyContent: msg.from === 'bot' ? 'flex-start' : 'flex-end', alignItems: 'flex-end', gap: 8 }}>
              {msg.from === 'bot' && (
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1c1c1c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🍜</div>
              )}
              <div style={{
                background: msg.from === 'bot' ? '#161616' : '#c8a96e',
                color: msg.from === 'bot' ? '#e0dcd4' : '#080808',
                borderRadius: msg.from === 'bot' ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
                padding: '9px 13px', maxWidth: '78%', fontSize: 13, lineHeight: 1.65,
                whiteSpace: 'pre-wrap', border: msg.from === 'bot' ? '1px solid #222' : 'none',
              }}>
                {msg.text}
              </div>
            </div>

            {/* 옵션 버튼 */}
            {msg.options && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, paddingLeft: 36 }}>
                {msg.options.map(opt => {
                  const disabled = !isLastMsg(i) || done || typing
                  return (
                    <button key={opt.value} onClick={() => handleOption(opt.label, opt.value)} disabled={disabled}
                      style={{
                        background: disabled ? '#111' : '#1a1a1a',
                        border: `1px solid ${disabled ? '#1e1e1e' : '#2e2e2e'}`,
                        color: disabled ? '#383838' : '#c8a96e',
                        borderRadius: 20, padding: '6px 14px', fontSize: 12,
                        cursor: disabled ? 'default' : 'pointer', transition: 'all 0.15s', ...F,
                      }}>
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            )}

            {/* 추천 카드 */}
            {msg.cards && (
              <div style={{ paddingLeft: 36, marginTop: 10 }}>
                {msg.cards.length === 0 ? (
                  <div style={{ fontSize: 13, color: '#555', padding: '12px 0', ...F }}>
                    😢 조건에 맞는 가게가 없어요. 다시 검색해보세요!
                  </div>
                ) : msg.cards.map((card, ci) => (
                  <div key={card.store.id} style={{
                    background: '#111', border: `1px solid ${ci === 0 ? '#c8a96e44' : '#1e1e1e'}`,
                    borderRadius: 12, padding: '12px 14px', marginBottom: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      {ci === 0 && (
                        <span style={{ fontSize: 10, background: '#c8a96e22', color: '#c8a96e', borderRadius: 6, padding: '2px 7px', fontWeight: 700, letterSpacing: 1, flexShrink: 0, ...F }}>TOP</span>
                      )}
                      {card.isPremium && (
                        <span style={{ fontSize: 10, background: '#f2994a22', color: '#f2994a', borderRadius: 6, padding: '2px 7px', fontWeight: 700, flexShrink: 0, ...F }}>PLUS</span>
                      )}
                      <span style={{ fontSize: 22 }}>{card.store.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, ...F }}>{card.store.name}</div>
                        <div style={{ fontSize: 10, color: '#555', marginTop: 1 }}>
                          ❤️ {card.totalLikes}
                          {card.store.address && <span> · 📍 {card.store.address.slice(0, 16)}{card.store.address.length > 16 ? '...' : ''}</span>}
                        </div>
                      </div>
                    </div>
                    {card.topReview && (
                      <div style={{ fontSize: 12, color: '#777', borderTop: '1px solid #1c1c1c', paddingTop: 8, lineHeight: 1.55, ...F }}>
                        💬 "{card.topReview.slice(0, 55)}{card.topReview.length > 55 ? '...' : ''}"
                      </div>
                    )}
                  </div>
                ))}

                {/* 다시 추천받기 */}
                <button onClick={reset} style={{
                  background: 'none', border: '1px solid #252525', color: '#555',
                  borderRadius: 20, padding: '6px 14px', fontSize: 11,
                  cursor: 'pointer', marginTop: 2, ...F,
                }}>
                  🔄 다시 추천받기
                </button>
              </div>
            )}
          </div>
        ))}

        {/* 타이핑 중 */}
        {typing && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1c1c1c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🍜</div>
            <div style={{ background: '#161616', border: '1px solid #222', borderRadius: '4px 14px 14px 14px', padding: '10px 14px', display: 'flex', gap: 5, alignItems: 'center' }}>
              {[0, 1, 2].map(n => (
                <div key={n} style={{
                  width: 6, height: 6, borderRadius: '50%', background: '#555',
                  animation: `chatDot 1.2s ${n * 0.2}s infinite ease-in-out`,
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <style>{`
        @keyframes chatDot {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.75); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

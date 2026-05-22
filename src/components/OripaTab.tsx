'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

// ── 타입 ────────────────────────────────────────────────────────
interface OripaPrize {
  id: string
  rank: number
  name: string
  description: string
  images: string[]
  quantity: number
}

interface OripaEvent {
  id: string
  title: string
  description: string
  start_date: string
  end_date: string
  total_slots: number
  remaining_slots: number
  seed_hash: string
  seed: string | null
  is_active: boolean
  oripa_prizes: OripaPrize[]
}

interface DrawResult {
  slotPosition: number
  prize: OripaPrize | null
  remainingTokens: number
}

interface TokenPackage {
  id: string
  tokens: number
  price: number
  label: string
}

interface Props {
  lang: 'ko' | 'en'
  F: React.CSSProperties
}

// ── 카드 컴포넌트 ────────────────────────────────────────────────
function OripaCard({ onDraw, disabled }: { onDraw: () => Promise<DrawResult | null>; disabled: boolean }) {
  const [flipped, setFlipped] = useState(false)
  const [result, setResult] = useState<DrawResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [imgIdx, setImgIdx] = useState(0)

  const handleClick = async () => {
    if (flipped || loading || disabled) return
    setLoading(true)
    const res = await onDraw()
    setLoading(false)
    if (res) {
      setResult(res)
      setFlipped(true)
    }
  }

  const prize = result?.prize ?? null
  const images = prize?.images || []

  const rankColor = (rank: number) => {
    if (rank === 1) return '#f59e0b'
    if (rank === 2) return '#94a3b8'
    if (rank === 3) return '#cd7c2f'
    return '#6fcf97'
  }

  return (
    <div
      onClick={handleClick}
      style={{
        width: '100%', aspectRatio: '2/3', borderRadius: 16, cursor: flipped ? 'default' : (loading ? 'wait' : 'pointer'),
        position: 'relative', perspective: 800, userSelect: 'none',
      }}
    >
      {/* 카드 뒤집기 애니메이션 */}
      <div style={{
        width: '100%', height: '100%', position: 'relative',
        transformStyle: 'preserve-3d',
        transition: 'transform 0.6s ease',
        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
      }}>
        {/* 앞면 (가려진 상태) */}
        <div style={{
          position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          borderRadius: 16, border: '2px solid #c8a96e33',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <div style={{ fontSize: 32 }}>🎴</div>
          {loading
            ? <div style={{ fontSize: 12, color: '#c8a96e', fontWeight: 700 }}>뽑는 중...</div>
            : <div style={{ fontSize: 11, color: '#555' }}>클릭하여 뽑기</div>
          }
          <div style={{
            position: 'absolute', inset: 4, borderRadius: 13,
            background: 'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(200,169,110,0.04) 6px, rgba(200,169,110,0.04) 12px)',
          }} />
        </div>

        {/* 뒷면 (결과) */}
        <div style={{
          position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          borderRadius: 16,
          border: `2px solid ${prize ? rankColor(prize.rank) + '88' : '#1e1e1e'}`,
          background: prize ? 'linear-gradient(135deg, #1a120a 0%, #2a1f0a 100%)' : '#0d0d0d',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', padding: 12,
        }}>
          {prize ? (
            <>
              {/* 등수 뱃지 */}
              <div style={{
                position: 'absolute', top: 10, right: 10,
                background: rankColor(prize.rank),
                color: '#080808', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 900,
              }}>
                {prize.rank}등
              </div>
              {/* 이미지 */}
              {images.length > 0 ? (
                <div style={{ width: '100%', flex: 1, position: 'relative', marginBottom: 8 }}>
                  <img
                    src={images[imgIdx]}
                    alt={prize.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
                  />
                  {images.length > 1 && (
                    <div style={{ position: 'absolute', bottom: 4, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 4 }}>
                      {images.map((_, i) => (
                        <div
                          key={i}
                          onClick={e => { e.stopPropagation(); setImgIdx(i) }}
                          style={{ width: 6, height: 6, borderRadius: '50%', background: i === imgIdx ? '#c8a96e' : '#555', cursor: 'pointer' }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 40, marginBottom: 8 }}>🎁</div>
              )}
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f0ece4', textAlign: 'center', lineHeight: 1.3 }}>{prize.name}</div>
              {prize.description && (
                <div style={{ fontSize: 10, color: '#888', textAlign: 'center', marginTop: 4, lineHeight: 1.4 }}>{prize.description}</div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 12, color: '#444' }}>...</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 토큰 구매 모달 ───────────────────────────────────────────────
function TokenShopModal({
  packages, accessToken, onClose, onPurchased, lang, F,
}: {
  packages: TokenPackage[]
  accessToken: string
  onClose: () => void
  onPurchased: (added: number) => void
  lang: 'ko' | 'en'
  F: React.CSSProperties
}) {
  const [selected, setSelected] = useState<TokenPackage | null>(null)
  const [loading, setLoading] = useState(false)

  const handleBuy = async () => {
    if (!selected || loading) return
    setLoading(true)

    // 1. 주문 생성
    const prepRes = await fetch('/api/payments/prepare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ packageId: selected.id }),
    })
    const { orderId, amount } = await prepRes.json()
    if (!orderId) { toast.error('주문 생성 실패'); setLoading(false); return }

    // 2. Toss Payments 결제창 (SDK 로드)
    const tossClientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || ''
    // @ts-expect-error toss sdk global
    const tossPayments = window.TossPayments ? window.TossPayments(tossClientKey) : null
    if (!tossPayments) {
      toast.error('결제 모듈을 불러오지 못했어요. 페이지를 새로고침해보세요.')
      setLoading(false)
      return
    }

    try {
      await tossPayments.requestPayment('카드', {
        amount,
        orderId,
        orderName: `먹콤보 토큰 ${selected.tokens}개`,
        customerName: '사용자',
        successUrl: `${window.location.origin}/api/payments/toss-success`,
        failUrl: `${window.location.origin}/?payment=fail`,
      })
    } catch {
      toast.error('결제가 취소됐어요')
    }
    setLoading(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: '#0d0d0d', borderRadius: '20px 20px 0 0', border: '1px solid #1e1e1e', width: '100%', maxWidth: 430, padding: '24px 20px 40px', ...F }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#f0ece4' }}>🪙 토큰 충전</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ fontSize: 11, color: '#555', marginBottom: 16 }}>토큰 1개 = 뽑기 1회</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {packages.map(pkg => (
            <button
              key={pkg.id}
              onClick={() => setSelected(pkg)}
              style={{
                background: selected?.id === pkg.id ? '#1a2a1a' : '#141414',
                border: `2px solid ${selected?.id === pkg.id ? '#6fcf97' : '#1e1e1e'}`,
                borderRadius: 12, padding: '14px 10px', cursor: 'pointer', textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 4 }}>🪙×{pkg.tokens}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: selected?.id === pkg.id ? '#6fcf97' : '#f0ece4', ...F }}>{pkg.label}</div>
              <div style={{ fontSize: 12, color: '#c8a96e', marginTop: 4 }}>{pkg.price.toLocaleString()}원</div>
            </button>
          ))}
        </div>

        <button
          onClick={handleBuy}
          disabled={!selected || loading}
          style={{
            width: '100%', padding: 14, background: selected ? '#c8a96e' : '#1a1a1a',
            color: selected ? '#080808' : '#333', border: 'none', borderRadius: 10,
            fontSize: 14, fontWeight: 700, cursor: selected ? 'pointer' : 'not-allowed', ...F,
          }}
        >
          {loading ? '결제 중...' : selected ? `${selected.price.toLocaleString()}원 결제하기` : '패키지를 선택해주세요'}
        </button>
      </div>
    </div>
  )
}

// ── 메인 오리파 탭 ───────────────────────────────────────────────
export default function OripaTab({ lang, F }: Props) {
  const [events, setEvents] = useState<OripaEvent[]>([])
  const [activeEvent, setActiveEvent] = useState<OripaEvent | null>(null)
  const [tokenBalance, setTokenBalance] = useState(0)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showShop, setShowShop] = useState(false)
  const [packages, setPackages] = useState<TokenPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [drawCards, setDrawCards] = useState<number[]>([])
  const [selectedPrize, setSelectedPrize] = useState<OripaPrize | null | 'empty'>(null)

  // 세션 + 데이터 로드
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session
      if (session) {
        setAccessToken(session.access_token)
        setUserId(session.user.id)
        const [tRes, roleRes] = await Promise.all([
          fetch('/api/tokens', { headers: { Authorization: `Bearer ${session.access_token}` } }),
          fetch('/api/auth/role', { headers: { Authorization: `Bearer ${session.access_token}` } }),
        ])
        const { balance } = await tRes.json()
        const { role } = await roleRes.json()
        setTokenBalance(balance)
        setIsAdmin(role === 'admin')
      }

      const [evRes, pkgRes] = await Promise.all([
        fetch('/api/oripa/events'),
        fetch('/api/payments/prepare'),
      ])
      const evData = await evRes.json()
      const pkgData = await pkgRes.json()
      if (Array.isArray(evData)) {
        setEvents(evData)
        const active = evData.find((e: OripaEvent) => e.is_active && new Date() >= new Date(e.start_date) && new Date() <= new Date(e.end_date))
        if (active) {
          setActiveEvent(active)
          setDrawCards(Array.from({ length: Math.min(active.remaining_slots, 20) }, (_, i) => i))
        }
      }
      if (Array.isArray(pkgData)) setPackages(pkgData)
      setLoading(false)
    })
  }, [])

  const refreshBalance = useCallback(async () => {
    if (!accessToken) return
    const res = await fetch('/api/tokens', { headers: { Authorization: `Bearer ${accessToken}` } })
    const { balance } = await res.json()
    setTokenBalance(balance)
  }, [accessToken])

  const handleDraw = useCallback(async (): Promise<DrawResult | null> => {
    if (!accessToken || !activeEvent) {
      toast.error('로그인이 필요해요')
      return null
    }
    if (tokenBalance < 1) {
      setShowShop(true)
      return null
    }

    const res = await fetch('/api/oripa/draw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ eventId: activeEvent.id }),
    })
    const data = await res.json()

    if (!res.ok) {
      if (res.status === 402) {
        toast.error('토큰이 부족해요')
        setShowShop(true)
        return null
      }
      toast.error(data.error || '뽑기 실패')
      return null
    }

    setTokenBalance(data.remainingTokens)
    setActiveEvent(prev => prev ? { ...prev, remaining_slots: prev.remaining_slots - 1 } : prev)

    if (data.prize) {
      setSelectedPrize(data.prize)
      toast.success(`🎉 ${data.prize.name} 당첨!`, { duration: 3000 })
    } else {
      setSelectedPrize('empty')
    }

    return data
  }, [accessToken, activeEvent, tokenBalance])

  const formatDate = (d: string) => new Date(d).toLocaleDateString('ko', { month: 'numeric', day: 'numeric' })

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#444', fontSize: 13, ...F }}>
        불러오는 중...
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 60 }}>
      {/* 토큰 샵 모달 */}
      {showShop && accessToken && (
        <TokenShopModal
          packages={packages}
          accessToken={accessToken}
          lang={lang}
          F={F}
          onClose={() => setShowShop(false)}
          onPurchased={(added) => {
            setTokenBalance(b => b + added)
            setShowShop(false)
          }}
        />
      )}

      {/* 헤더 */}
      <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #161616', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#f0ece4', ...F }}>🎴 오리파</div>
          <div style={{ fontSize: 11, color: '#555', marginTop: 2, ...F }}>랜덤 뽑기 이벤트</div>
        </div>
        {userId ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isAdmin && (
              <button
                onClick={async () => {
                  const res = await fetch('/api/tokens', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                    body: JSON.stringify({ amount: 10 }),
                  })
                  const { balance } = await res.json()
                  if (balance != null) { setTokenBalance(balance); toast.success('테스트 토큰 10개 지급!') }
                }}
                style={{ fontSize: 10, background: '#1a1a2e', border: '1px solid #333', borderRadius: 12, padding: '4px 8px', color: '#888', cursor: 'pointer' }}
              >
                +10 테스트
              </button>
            )}
            <button
              onClick={() => setShowShop(true)}
              style={{ background: '#141414', border: '1px solid #c8a96e33', borderRadius: 20, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
            >
              <span style={{ fontSize: 14 }}>🪙</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#c8a96e', ...F }}>{tokenBalance}</span>
              <span style={{ fontSize: 11, color: '#444', ...F }}>충전</span>
            </button>
          </div>
        ) : (
          <div style={{ fontSize: 11, color: '#555', ...F }}>로그인 후 이용 가능</div>
        )}
      </div>

      {/* 진행 중인 이벤트 없을 때 */}
      {!activeEvent && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🎴</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#f0ece4', marginBottom: 8, ...F }}>진행 중인 이벤트가 없어요</div>
          <div style={{ fontSize: 12, color: '#555', ...F }}>곧 새 이벤트가 열릴 예정이에요!</div>
        </div>
      )}

      {/* 활성 이벤트 */}
      {activeEvent && (
        <div style={{ padding: '16px 20px 0' }}>
          {/* 이벤트 정보 */}
          <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f0ece4', marginBottom: 4, ...F }}>{activeEvent.title}</div>
            {activeEvent.description && (
              <div style={{ fontSize: 12, color: '#666', marginBottom: 8, ...F }}>{activeEvent.description}</div>
            )}
            <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#555', ...F }}>
              <span>📅 {formatDate(activeEvent.start_date)} ~ {formatDate(activeEvent.end_date)}</span>
              <span>🎴 남은 슬롯: <span style={{ color: '#c8a96e', fontWeight: 700 }}>{activeEvent.remaining_slots}</span></span>
            </div>

            {/* 공정성 배지 */}
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ background: '#0a1a0a', border: '1px solid #1a3a1a', borderRadius: 20, padding: '3px 10px', fontSize: 10, color: '#6fcf97' }}>
                ✓ 사전 시드 해시 공개
              </div>
              <a
                href={`/api/oripa/verify?eventId=${activeEvent.id}`}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 10, color: '#555', textDecoration: 'none' }}
              >
                검증 →
              </a>
            </div>
          </div>

          {/* 상품 목록 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#555', letterSpacing: 2, fontWeight: 700, marginBottom: 10, ...F }}>PRIZES</div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4 }}>
              {[...activeEvent.oripa_prizes].sort((a, b) => a.rank - b.rank).map(prize => {
                const rc = prize.rank === 1 ? '#f59e0b' : prize.rank === 2 ? '#94a3b8' : prize.rank === 3 ? '#cd7c2f' : '#6fcf97'
                return (
                <div
                  key={prize.id}
                  style={{
                    flexShrink: 0, width: 100, background: '#0d0d0d',
                    border: `1px solid ${rc}33`,
                    borderRadius: 12, padding: '10px 8px', textAlign: 'center',
                  }}
                >
                  {prize.images?.[0] ? (
                    <img src={prize.images[0]} alt={prize.name} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8, marginBottom: 6 }} />
                  ) : (
                    <div style={{ fontSize: 28, marginBottom: 6 }}>🎁</div>
                  )}
                  <div style={{ fontSize: 9, fontWeight: 900, color: rc, marginBottom: 3 }}>{prize.rank}등</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#f0ece4', lineHeight: 1.3, ...F }}>{prize.name}</div>
                  <div style={{ fontSize: 9, color: '#555', marginTop: 3, ...F }}>×{prize.quantity}</div>
                </div>
              )})}
            </div>
          </div>

          {/* 뽑기 카드 그리드 */}
          <div style={{ fontSize: 11, color: '#555', letterSpacing: 2, fontWeight: 700, marginBottom: 12, ...F }}>DRAW</div>

          {!userId ? (
            <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 14, padding: '32px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 16, ...F }}>뽑기에 참여하려면 로그인이 필요해요</div>
            </div>
          ) : tokenBalance < 1 ? (
            <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 14, padding: '32px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 16, ...F }}>토큰이 없어요. 충전 후 뽑기에 참여하세요!</div>
              <button
                onClick={() => setShowShop(true)}
                style={{ background: '#c8a96e', color: '#080808', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer', ...F }}
              >
                🪙 토큰 충전하기
              </button>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 14, ...F }}>
                카드를 클릭해서 뽑아보세요! (토큰 1개/회)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
                {drawCards.map(idx => (
                  <OripaCard key={idx} onDraw={handleDraw} disabled={tokenBalance < 1} />
                ))}
              </div>
              {activeEvent.remaining_slots > drawCards.length && (
                <button
                  onClick={() => setDrawCards(prev => [...prev, ...Array.from({ length: Math.min(9, activeEvent.remaining_slots - prev.length) }, (_, i) => prev.length + i)])}
                  style={{ width: '100%', padding: 10, background: '#141414', border: '1px solid #222', borderRadius: 10, fontSize: 12, color: '#888', cursor: 'pointer', marginBottom: 16, ...F }}
                >
                  카드 더 보기 ({activeEvent.remaining_slots - drawCards.length}개 남음)
                </button>
              )}
            </>
          )}

          {/* 시드 해시 표시 (공정성) */}
          <div style={{ background: '#080808', border: '1px solid #141414', borderRadius: 10, padding: '10px 14px', marginTop: 8, marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: '#333', marginBottom: 4, ...F }}>공정성 검증 — 사전 시드 해시 (SHA-256)</div>
            <div style={{ fontSize: 9, color: '#444', wordBreak: 'break-all', fontFamily: "'Courier New', monospace" }}>
              {activeEvent.seed_hash}
            </div>
            {activeEvent.seed && (
              <div style={{ marginTop: 6, fontSize: 9, color: '#6fcf97', wordBreak: 'break-all', fontFamily: "'Courier New', monospace" }}>
                공개된 시드: {activeEvent.seed}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 과거 이벤트 */}
      {events.filter(e => !e.is_active || new Date() > new Date(e.end_date)).length > 0 && (
        <div style={{ padding: '0 20px 20px' }}>
          <div style={{ fontSize: 11, color: '#333', letterSpacing: 2, fontWeight: 700, marginBottom: 12, ...F }}>PAST EVENTS</div>
          {events
            .filter(e => !e.is_active || new Date() > new Date(e.end_date))
            .map(ev => (
              <div key={ev.id} style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 12, padding: '12px 16px', marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#666', marginBottom: 4, ...F }}>{ev.title}</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#444', ...F }}>{formatDate(ev.start_date)} ~ {formatDate(ev.end_date)}</span>
                  <a
                    href={`/api/oripa/verify?eventId=${ev.id}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 10, color: ev.seed ? '#6fcf97' : '#555', textDecoration: 'none', ...F }}
                  >
                    {ev.seed ? '✓ 시드 검증' : '시드 미공개'}
                  </a>
                </div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}

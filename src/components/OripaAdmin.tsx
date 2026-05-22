'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface OripaPrize {
  id?: string
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

const RANK_LABELS = ['1등', '2등', '3등', '4등', '5등']
const RANK_COLORS = ['#f59e0b', '#94a3b8', '#cd7c2f', '#6fcf97', '#a78bfa']

export default function OripaAdmin() {
  const [events, setEvents] = useState<OripaEvent[]>([])
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editingEvent, setEditingEvent] = useState<OripaEvent | null>(null)

  // 이벤트 생성 폼
  const [form, setForm] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    total_slots: 100,
    prizes: [
      { rank: 1, name: '', description: '', images: [] as string[], quantity: 1 },
      { rank: 2, name: '', description: '', images: [] as string[], quantity: 3 },
      { rank: 3, name: '', description: '', images: [] as string[], quantity: 10 },
      { rank: 4, name: '', description: '', images: [] as string[], quantity: 86 },
    ] as OripaPrize[],
  })

  const fileRefs = useRef<{ [key: number]: HTMLInputElement | null }>({})

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token || null
      setAccessToken(token)
      if (token) await loadEvents(token)
      setLoading(false)
    })
  }, [])

  const loadEvents = async (token: string) => {
    const res = await fetch('/api/oripa/events', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (Array.isArray(data)) setEvents(data)
  }

  const uploadImage = async (file: File, rank: number) => {
    if (!accessToken) return
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/oripa/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: fd,
    })
    const { url, error } = await res.json()
    if (error) { toast.error('이미지 업로드 실패'); return }
    setForm(f => ({
      ...f,
      prizes: f.prizes.map(p =>
        p.rank === rank ? { ...p, images: [...p.images, url].slice(0, 5) } : p
      ),
    }))
    toast.success('이미지 업로드 완료')
  }

  const removeImage = (rank: number, idx: number) => {
    setForm(f => ({
      ...f,
      prizes: f.prizes.map(p =>
        p.rank === rank ? { ...p, images: p.images.filter((_, i) => i !== idx) } : p
      ),
    }))
  }

  const addPrize = () => {
    const nextRank = Math.max(...form.prizes.map(p => p.rank)) + 1
    setForm(f => ({
      ...f,
      prizes: [...f.prizes, { rank: nextRank, name: '', description: '', images: [], quantity: 1 }],
    }))
  }

  const removePrize = (rank: number) => {
    if (form.prizes.length <= 1) return
    setForm(f => ({ ...f, prizes: f.prizes.filter(p => p.rank !== rank) }))
  }

  const setPrize = (rank: number, field: keyof OripaPrize, value: unknown) => {
    setForm(f => ({
      ...f,
      prizes: f.prizes.map(p => p.rank === rank ? { ...p, [field]: value } : p),
    }))
  }

  const totalPrizeQty = form.prizes.reduce((s, p) => s + p.quantity, 0)

  const handleCreate = async () => {
    if (!accessToken) return
    if (!form.title || !form.start_date || !form.end_date) {
      toast.error('제목과 날짜를 입력해주세요')
      return
    }
    if (form.prizes.some(p => !p.name)) {
      toast.error('모든 상품명을 입력해주세요')
      return
    }
    const maxRank = Math.max(...form.prizes.map(p => p.rank))
    const fixedQty = form.prizes.filter(p => p.rank !== maxRank).reduce((s, p) => s + p.quantity, 0)
    if (fixedQty >= form.total_slots) {
      toast.error('1~3등 수량 합계가 총 슬롯 수를 초과해요')
      return
    }

    // 최하위 등수 수량을 나머지 슬롯 수로 자동 계산
    const prizesWithAutoQty = form.prizes.map(p =>
      p.rank === maxRank ? { ...p, quantity: form.total_slots - fixedQty } : p
    )

    setCreating(true)
    const res = await fetch('/api/oripa/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ ...form, prizes: prizesWithAutoQty }),
    })
    const data = await res.json()
    setCreating(false)

    if (data.error) { toast.error(data.error); return }
    toast.success('이벤트 생성 완료!')
    setForm({
      title: '', description: '', start_date: '', end_date: '', total_slots: 100,
      prizes: [
        { rank: 1, name: '', description: '', images: [], quantity: 1 },
        { rank: 2, name: '', description: '', images: [], quantity: 3 },
        { rank: 3, name: '', description: '', images: [], quantity: 10 },
      ],
    })
    await loadEvents(accessToken)
  }

  const handleToggleActive = async (ev: OripaEvent) => {
    if (!accessToken) return
    const res = await fetch('/api/oripa/events', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ id: ev.id, is_active: !ev.is_active }),
    })
    if (res.ok) {
      await loadEvents(accessToken)
      toast.success(ev.is_active ? '이벤트 비활성화' : '이벤트 활성화')
    }
  }

  const handleRevealSeed = async (ev: OripaEvent) => {
    if (!accessToken) return
    if (!confirm('시드를 공개하면 뽑기 배치가 검증 가능해져요. 계속할까요?')) return
    const res = await fetch('/api/oripa/events', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ id: ev.id, reveal_seed: true }),
    })
    if (res.ok) {
      await loadEvents(accessToken)
      toast.success('시드 공개 완료!')
    }
  }

  const handleEditDates = async () => {
    if (!accessToken || !editingEvent) return
    const res = await fetch('/api/oripa/events', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        id: editingEvent.id,
        title: editingEvent.title,
        description: editingEvent.description,
        start_date: editingEvent.start_date,
        end_date: editingEvent.end_date,
      }),
    })
    if (res.ok) {
      await loadEvents(accessToken)
      setEditingEvent(null)
      toast.success('수정 완료')
    }
  }

  if (loading) return <div style={{ color: '#444', fontSize: 13, padding: 20 }}>불러오는 중...</div>

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#141414', border: '1px solid #2a2a2a', borderRadius: 8,
    padding: '10px 12px', color: '#f0ece4', fontSize: 13, outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* 이벤트 목록 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: '#c8a96e', fontWeight: 700, letterSpacing: 2, marginBottom: 12 }}>ORIPA EVENTS</div>
        {events.length === 0 && (
          <div style={{ fontSize: 12, color: '#444' }}>이벤트가 없어요. 아래에서 생성해주세요.</div>
        )}
        {events.map(ev => (
          <div key={ev.id} style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f0ece4' }}>{ev.title}</div>
                <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>
                  {new Date(ev.start_date).toLocaleDateString('ko')} ~ {new Date(ev.end_date).toLocaleDateString('ko')}
                </div>
                <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                  총 {ev.total_slots}슬롯 · 남은 슬롯 {ev.remaining_slots}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexDirection: 'column', alignItems: 'flex-end' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: ev.is_active ? '#6fcf97' : '#e05a5a', background: ev.is_active ? '#0a1a0a' : '#1a0a0a', border: `1px solid ${ev.is_active ? '#1a3a1a' : '#3a1a1a'}`, borderRadius: 20, padding: '2px 8px' }}>
                  {ev.is_active ? '활성' : '비활성'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button onClick={() => handleToggleActive(ev)} style={{ fontSize: 11, padding: '5px 10px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, color: '#c8a96e', cursor: 'pointer' }}>
                {ev.is_active ? '비활성화' : '활성화'}
              </button>
              <button onClick={() => setEditingEvent(ev)} style={{ fontSize: 11, padding: '5px 10px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, color: '#888', cursor: 'pointer' }}>
                날짜/제목 수정
              </button>
              {!ev.seed && (
                <button onClick={() => handleRevealSeed(ev)} style={{ fontSize: 11, padding: '5px 10px', background: '#0a1a0a', border: '1px solid #1a3a1a', borderRadius: 8, color: '#6fcf97', cursor: 'pointer' }}>
                  시드 공개
                </button>
              )}
              {ev.seed && (
                <span style={{ fontSize: 10, color: '#6fcf97', padding: '5px 10px' }}>✓ 시드 공개됨</span>
              )}
              <a
                href={`/api/oripa/verify?eventId=${ev.id}`}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 11, padding: '5px 10px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, color: '#555', cursor: 'pointer', textDecoration: 'none' }}
              >
                검증 보기
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* 날짜/제목 수정 모달 */}
      {editingEvent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 16, padding: 24, width: '100%', maxWidth: 380 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f0ece4', marginBottom: 16 }}>이벤트 수정</div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: '#555', marginBottom: 6 }}>제목</div>
              <input value={editingEvent.title} onChange={e => setEditingEvent({ ...editingEvent, title: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: '#555', marginBottom: 6 }}>설명</div>
              <input value={editingEvent.description || ''} onChange={e => setEditingEvent({ ...editingEvent, description: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: '#555', marginBottom: 6 }}>시작일</div>
                <input type="datetime-local" value={editingEvent.start_date.slice(0, 16)} onChange={e => setEditingEvent({ ...editingEvent, start_date: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#555', marginBottom: 6 }}>종료일</div>
                <input type="datetime-local" value={editingEvent.end_date.slice(0, 16)} onChange={e => setEditingEvent({ ...editingEvent, end_date: e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleEditDates} style={{ flex: 1, padding: '10px', background: '#c8a96e', color: '#080808', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>저장</button>
              <button onClick={() => setEditingEvent(null)} style={{ flex: 1, padding: '10px', background: '#1a1a1a', color: '#888', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 신규 이벤트 생성 */}
      <div style={{ borderTop: '1px solid #1e1e1e', paddingTop: 20 }}>
        <div style={{ fontSize: 12, color: '#c8a96e', fontWeight: 700, letterSpacing: 2, marginBottom: 16 }}>새 이벤트 생성</div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: '#555', marginBottom: 6 }}>이벤트 제목</div>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="예: 2024년 1월 오리파" style={inputStyle} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: '#555', marginBottom: 6 }}>설명 (선택)</div>
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="이벤트 설명..." style={inputStyle} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: '#555', marginBottom: 6 }}>시작일시</div>
            <input type="datetime-local" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#555', marginBottom: 6 }}>종료일시</div>
            <input type="datetime-local" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} style={inputStyle} />
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#555', marginBottom: 6 }}>총 슬롯 수 (상품 제외 나머지는 꽝)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="number"
              min={totalPrizeQty}
              value={form.total_slots}
              onChange={e => setForm(f => ({ ...f, total_slots: Math.max(totalPrizeQty, Number(e.target.value)) }))}
              style={{ ...inputStyle, width: 120 }}
            />
            <span style={{ fontSize: 11, color: '#555' }}>꽝: {form.total_slots - totalPrizeQty}개</span>
          </div>
        </div>

        {/* 상품 설정 */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: '#555', fontWeight: 700 }}>상품 설정</div>
            {form.prizes.length < 5 && (
              <button onClick={addPrize} style={{ fontSize: 11, padding: '4px 10px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, color: '#c8a96e', cursor: 'pointer' }}>
                + 등수 추가
              </button>
            )}
          </div>

          {form.prizes.map(prize => (
            <div key={prize.rank} style={{ background: '#141414', border: `1px solid ${RANK_COLORS[(prize.rank - 1) % RANK_COLORS.length]}22`, borderRadius: 12, padding: '14px 14px', marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: RANK_COLORS[(prize.rank - 1) % RANK_COLORS.length] }}>
                  {RANK_LABELS[(prize.rank - 1)] || `${prize.rank}등`}
                </div>
                {form.prizes.length > 1 && (
                  <button onClick={() => removePrize(prize.rank)} style={{ fontSize: 11, color: '#e05a5a', background: 'none', border: 'none', cursor: 'pointer' }}>삭제</button>
                )}
              </div>

              {(() => {
                const maxRank = Math.max(...form.prizes.map(p => p.rank))
                const isLast = prize.rank === maxRank
                const autoQty = isLast ? form.total_slots - form.prizes.filter(p => p.rank !== maxRank).reduce((s, p) => s + p.quantity, 0) : null
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 8, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, color: '#555', marginBottom: 4 }}>상품명</div>
                      <input value={prize.name} onChange={e => setPrize(prize.rank, 'name', e.target.value)} placeholder="상품명 입력" style={inputStyle} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: '#555', marginBottom: 4 }}>
                        수량 {isLast && <span style={{ color: '#6fcf97' }}>(자동)</span>}
                      </div>
                      {isLast ? (
                        <div style={{ ...inputStyle, color: '#6fcf97', background: '#0a1a0a', display: 'flex', alignItems: 'center' }}>
                          {autoQty}
                        </div>
                      ) : (
                        <input type="number" min={1} value={prize.quantity} onChange={e => setPrize(prize.rank, 'quantity', Math.max(1, Number(e.target.value)))} style={inputStyle} />
                      )}
                    </div>
                  </div>
                )
              })()}

              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: '#555', marginBottom: 4 }}>상품 설명</div>
                <input value={prize.description} onChange={e => setPrize(prize.rank, 'description', e.target.value)} placeholder="상품 설명 (선택)" style={inputStyle} />
              </div>

              {/* 이미지 업로드 (최대 5장) */}
              <div>
                <div style={{ fontSize: 10, color: '#555', marginBottom: 6 }}>상품 이미지 (최대 5장)</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {prize.images.map((url, i) => (
                    <div key={i} style={{ position: 'relative', width: 52, height: 52 }}>
                      <img src={url} alt="" style={{ width: 52, height: 52, borderRadius: 6, objectFit: 'cover' }} />
                      <button
                        onClick={() => removeImage(prize.rank, i)}
                        style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%', background: '#e05a5a', border: 'none', color: '#fff', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >✕</button>
                    </div>
                  ))}
                  {prize.images.length < 5 && (
                    <>
                      <input
                        ref={el => { fileRefs.current[prize.rank] = el }}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f, prize.rank) }}
                      />
                      <button
                        onClick={() => fileRefs.current[prize.rank]?.click()}
                        style={{ width: 52, height: 52, border: '1px dashed #2a2a2a', borderRadius: 6, background: '#1a1a1a', color: '#555', fontSize: 20, cursor: 'pointer' }}
                      >+</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleCreate}
          disabled={creating}
          style={{ width: '100%', padding: '13px', background: '#c8a96e', color: '#080808', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: creating ? 'wait' : 'pointer', marginTop: 8 }}
        >
          {creating ? '생성 중...' : '🎴 이벤트 생성'}
        </button>
      </div>
    </div>
  )
}

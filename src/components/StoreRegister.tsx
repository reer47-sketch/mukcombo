'use client'
import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { CAT_ACCENT } from '@/lib/i18n'
import type { Lang, Translations } from '@/lib/i18n'
import type { Store } from '@/types'

interface Props {
  lang: Lang
  t: Translations
  F: React.CSSProperties
  onSaved: (store: Store) => void
  onCancel: () => void
}

type MenuNames = Record<string, { ko: string; en: string }>
type Categories = Record<string, string[]>

interface DraftStore {
  name: string; nameEn: string; emoji: string
  address: string; addressEn: string; mapUrl: string
  categories: Categories
  prices: Record<string, string>
  menuNames: MenuNames
  menuOptions: Record<string, unknown>
}

const EMPTY_STORE = {
  name: '', nameEn: '', emoji: '🍜',
  address: '', addressEn: '', mapUrl: '',
  categories: { '🍜 메인메뉴': [], '🥗 사이드메뉴': [], '➕ 추가토핑': [], '🥤 음료': [] },
  prices: {}, menuNames: {}, menuOptions: {},
}

export default function StoreRegister({ lang, t, F, onSaved, onCancel }: Props) {
  const [step, setStep] = useState<'upload' | 'edit' | 'saving'>('upload')
  const [analyzing, setAnalyzing] = useState(false)
  const [draft, setDraft] = useState<DraftStore>(EMPTY_STORE)
  const [previewImages, setPreviewImages] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const s = (v: string) => ({ ...F, ...({ style: v } as object) })
  void s

  const handleImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 5)
    if (!files.length) return
    setPreviewImages(files.map(f => URL.createObjectURL(f)))
    setAnalyzing(true)

    const fd = new FormData()
    files.forEach(f => fd.append('images', f))

    try {
      const res = await fetch('/api/ai/extract-menu', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.success) {
        setDraft({ ...EMPTY_STORE, ...json.data })
        setStep('edit')
        toast.success(lang === 'ko' ? t.aiDone : t.aiDone)
      } else {
        toast.error(t.aiError)
        setStep('edit')
      }
    } catch {
      toast.error(t.aiError)
      setStep('edit')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSave = async () => {
    if (!draft.name) return toast.error(lang === 'ko' ? '가게명을 입력해주세요' : 'Enter store name')
    setStep('saving')
    try {
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const store = await res.json()
      toast.success(lang === 'ko' ? '가게 등록 완료! 🎉' : 'Store registered! 🎉')
      onSaved(store)
    } catch {
      toast.error(t.toastError)
      setStep('edit')
    }
  }

  const inp = (val: string, onChange: (v: string) => void, placeholder = '') => (
    <input value={val} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: '100%', background: '#141414', border: '1px solid #2a2a2a', borderRadius: 8, padding: '9px 12px', color: '#f0ece4', fontSize: 13, outline: 'none', boxSizing: 'border-box', ...F }} />
  )

  return (
    <div style={{ padding: '20px 20px 100px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#c8a96e', fontSize: 13, fontWeight: 700, cursor: 'pointer', ...F }}>
          {t.backBtn}
        </button>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#c8a96e', ...F }}>{t.registerTitle}</span>
      </div>

      {/* STEP: UPLOAD */}
      {step === 'upload' && (
        <div>
          <div style={{ fontSize: 11, color: '#555', letterSpacing: 2, fontWeight: 700, marginBottom: 10, ...F }}>
            {t.uploadMenuImages.toUpperCase()}
          </div>
          <p style={{ fontSize: 12, color: '#666', marginBottom: 16, ...F }}>{t.uploadMenuImagesSub}</p>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleImages} style={{ display: 'none' }} />
          {analyzing ? (
            <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 14, padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>🤖</div>
              <div style={{ fontSize: 13, color: '#c8a96e', fontWeight: 700, ...F }}>{t.aiAnalyzing}</div>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} style={{ width: '100%', aspectRatio: '16/9', background: '#0d0d0d', border: '1.5px dashed #252525', borderRadius: 14, color: '#484848', fontSize: 13, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, ...F }}>
              <span style={{ fontSize: 32 }}>📷</span>
              <span style={{ fontWeight: 700 }}>{t.uploadMenuImages}</span>
              <span style={{ fontSize: 11, color: '#333' }}>{t.uploadMenuImagesSub}</span>
            </button>
          )}
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <button onClick={() => setStep('edit')} style={{ background: 'none', border: 'none', color: '#555', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', ...F }}>
              {lang === 'ko' ? '사진 없이 직접 입력하기' : 'Enter manually without photo'}
            </button>
          </div>
        </div>
      )}

      {/* STEP: EDIT */}
      {(step === 'edit' || step === 'saving') && (
        <div>
          {previewImages.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto' }}>
              {previewImages.map((src, i) => (
                <img key={i} src={src} alt="" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
              ))}
            </div>
          )}

          {/* 가게 기본 정보 */}
          <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 12, padding: '16px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#c8a96e', fontWeight: 700, letterSpacing: 1, marginBottom: 12, ...F }}>가게 기본 정보</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 10, color: '#666', marginBottom: 4, ...F }}>🇰🇷 가게명</div>
                {inp(draft.name, v => setDraft({ ...draft, name: v }), '고르다')}
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#666', marginBottom: 4, ...F }}>🇺🇸 English Name</div>
                {inp(draft.nameEn, v => setDraft({ ...draft, nameEn: v }), 'Gorda')}
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: '#666', marginBottom: 4, ...F }}>📍 주소</div>
              {inp(draft.address, v => setDraft({ ...draft, address: v }), '경기 평택시...')}
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: '#666', marginBottom: 4, ...F }}>📍 Address (EN)</div>
              {inp(draft.addressEn, v => setDraft({ ...draft, addressEn: v }), '2F, 12 Pyeongtaek...')}
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#666', marginBottom: 4, ...F }}>🗺️ 지도 URL (네이버/카카오)</div>
              {inp(draft.mapUrl, v => setDraft({ ...draft, mapUrl: v }), 'https://naver.me/...')}
            </div>
          </div>

          {/* 메뉴명 편집 */}
          <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 12, padding: '16px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#c8a96e', fontWeight: 700, letterSpacing: 1, marginBottom: 12, ...F }}>메뉴명 (KO / EN)</div>
            {Object.entries(draft.categories).map(([cat, items]) => (
              (items as string[]).length > 0 && (
                <div key={cat} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: CAT_ACCENT[cat] || '#c8a96e', fontWeight: 700, letterSpacing: 1, marginBottom: 8, ...F }}>{cat}</div>
                  {(items as string[]).map((koKey: string) => (
                    <div key={koKey} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
                      <input value={draft.menuNames[koKey]?.ko || koKey}
                        onChange={e => setDraft({ ...draft, menuNames: { ...draft.menuNames, [koKey]: { ...(draft.menuNames[koKey] || { ko: koKey, en: '' }), ko: e.target.value } } })}
                        style={{ background: '#141414', border: '1px solid #222', borderRadius: 6, padding: '6px 10px', color: '#f0ece4', fontSize: 12, outline: 'none', fontFamily: "'Noto Sans KR',sans-serif" }} />
                      <input value={draft.menuNames[koKey]?.en || ''}
                        onChange={e => setDraft({ ...draft, menuNames: { ...draft.menuNames, [koKey]: { ...(draft.menuNames[koKey] || { ko: koKey, en: '' }), en: e.target.value } } })}
                        style={{ background: '#141414', border: '1.5px solid #2a2a2a', borderRadius: 6, padding: '6px 10px', color: '#c8a96e', fontSize: 12, outline: 'none', fontFamily: "'Inter',sans-serif" }} />
                    </div>
                  ))}
                </div>
              )
            ))}
          </div>

          <button onClick={handleSave} disabled={step === 'saving'} style={{ width: '100%', padding: 14, background: step === 'saving' ? '#1a1a1a' : '#c8a96e', color: step === 'saving' ? '#555' : '#080808', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: step === 'saving' ? 'not-allowed' : 'pointer', ...F }}>
            {step === 'saving' ? '저장 중...' : t.saveStore}
          </button>
        </div>
      )}
    </div>
  )
}

'use client'
import { useState, useEffect, useRef } from 'react'

export interface FoodCat {
  id: string
  name_ko: string
  name_en: string
  group_ko: string
  group_en: string
  group_emoji: string
}

// ── 키워드 자동 분류 규칙 ─────────────────────────────────
const KEYWORD_RULES: { keys: string[]; catMatch: string }[] = [
  // 🇯🇵 일식
  { keys: ['라멘', '돈코츠', '쇼유라멘', '미소라멘', '츠케멘'], catMatch: '라멘' },
  { keys: ['우동'], catMatch: '우동' },
  { keys: ['소바'], catMatch: '소바' },
  { keys: ['규동', '가츠동', '오야코동', '돈부리', '덮밥(일식)'], catMatch: '돈부리' },
  { keys: ['스시', '초밥'], catMatch: '스시' },
  { keys: ['사시미'], catMatch: '사시미' },
  { keys: ['텐동', '텐푸라', '가라아게'], catMatch: '튀김' },
  { keys: ['일본카레', '가레라이스', '카레라이스'], catMatch: '일본카레' },
  // 🇨🇳 중식
  { keys: ['짜장', '짜장면'], catMatch: '짜장' },
  { keys: ['짬뽕'], catMatch: '짬뽕' },
  { keys: ['마라탕', '마라면', '마라샹궈', '훠궈'], catMatch: '마라' },
  { keys: ['꿔바로우', '고추잡채', '깐풍'], catMatch: '꿔바로우' },
  { keys: ['볶음밥(중식)', '중화비빔밥'], catMatch: '볶음밥' },
  { keys: ['딤섬', '샤오롱바오', '하가우'], catMatch: '딤섬' },
  // 🇹🇭 태국
  { keys: ['팟타이'], catMatch: '팟타이' },
  { keys: ['그린커리', '레드커리', '옐로커리', '태국커리'], catMatch: '태국커리' },
  { keys: ['똠얌'], catMatch: '똠얌' },
  // 🇻🇳 베트남
  { keys: ['쌀국수', '포보', '포'], catMatch: '쌀국수' },
  { keys: ['분짜'], catMatch: '분짜' },
  { keys: ['반미'], catMatch: '반미' },
  // 🇮🇳 인도/중동
  { keys: ['커리(인도)', '난', '비리야니', '인도커리'], catMatch: '인도커리' },
  { keys: ['케밥', '팔라펠', '샤와르마'], catMatch: '케밥' },
  // 🇮🇹 이탈리아
  { keys: ['파스타', '알리오', '까르보나라', '봉골레', '라구', '뇨끼'], catMatch: '파스타' },
  { keys: ['피자', '마르게리타', '페퍼로니'], catMatch: '피자' },
  { keys: ['리조또'], catMatch: '리조또' },
  // 🇺🇸 미국/서양
  { keys: ['버거', '햄버거', '치즈버거'], catMatch: '버거' },
  { keys: ['스테이크', '립아이', '서로인', '티본'], catMatch: '스테이크' },
  { keys: ['샌드위치', '클럽샌드위치'], catMatch: '샌드위치' },
  { keys: ['샐러드'], catMatch: '샐러드' },
  { keys: ['브런치', '에그베네딕트', '팬케이크'], catMatch: '브런치' },
  // 🇰🇷 한식
  { keys: ['찌개', '전골', '부대찌개', '김치찌개', '된장찌개'], catMatch: '찌개' },
  { keys: ['설렁탕', '곰탕', '해장국', '국밥', '갈비탕'], catMatch: '탕' },
  { keys: ['제육볶음', '오징어볶음', '낙지볶음'], catMatch: '볶음(한식)' },
  { keys: ['삼겹살', '목살', '불고기', '갈비', '항정살', '구이'], catMatch: '구이' },
  { keys: ['비빔밥', '솥밥', '한식덮밥'], catMatch: '비빔밥' },
  { keys: ['떡볶이', '김밥', '순대'], catMatch: '분식' },
  // 🌮 멕시코
  { keys: ['타코', '부리또', '퀘사디아', '나초'], catMatch: '타코' },
  // 🍰 디저트
  { keys: ['케이크', '마카롱', '쿠키', '빙수', '아이스크림', '와플', '크레이프'], catMatch: '케이크' },
  // ☕ 음료
  { keys: ['커피', '라떼', '에스프레소', '아메리카노', '카푸치노', '에이드', '주스', '스무디', '차(음료)'], catMatch: '커피' },
  { keys: ['맥주', '와인', '칵테일', '하이볼', '소주', '막걸리', '생맥주', '병맥주'], catMatch: '맥주' },
]

export function suggestCategory(menuName: string, cats: FoodCat[]): FoodCat | null {
  if (!menuName || cats.length === 0) return null
  const lower = menuName.toLowerCase()
  for (const { keys, catMatch } of KEYWORD_RULES) {
    if (keys.some(k => lower.includes(k.toLowerCase()))) {
      const found = cats.find(fc =>
        fc.name_ko.includes(catMatch) || catMatch.includes(fc.name_ko)
      )
      if (found) return found
    }
  }
  return null
}

const F: React.CSSProperties = { fontFamily: "'Noto Sans KR', sans-serif" }
const btnBase: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontFamily: "'Noto Sans KR', sans-serif",
}

interface Props {
  menuName: string
  value: string               // confirmed food_category_id
  onChange: (id: string) => void
  foodCategories: FoodCat[]
}

export function CategoryPicker({ menuName, value, onChange, foodCategories }: Props) {
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [search, setSearch] = useState('')
  const [activeGroup, setActiveGroup] = useState('')
  const prevName = useRef(menuName)

  // 메뉴명 바뀌면 dismissed 초기화 (새 제안 허용)
  useEffect(() => {
    if (prevName.current !== menuName) {
      setDismissed(false)
      prevName.current = menuName
    }
  }, [menuName])

  const confirmed = value ? foodCategories.find(fc => fc.id === value) : null
  const suggestion = !value && !dismissed && !open
    ? suggestCategory(menuName, foodCategories)
    : null

  // 그룹 목록
  const groups: { key: string; emoji: string; label: string }[] = []
  const seenGroups = new Set<string>()
  foodCategories.forEach(fc => {
    if (!seenGroups.has(fc.group_ko)) {
      seenGroups.add(fc.group_ko)
      groups.push({ key: fc.group_ko, emoji: fc.group_emoji || '', label: fc.group_ko })
    }
  })

  // 검색/그룹 필터
  const filtered = search.trim()
    ? foodCategories.filter(fc =>
        fc.name_ko.includes(search) ||
        fc.name_en.toLowerCase().includes(search.toLowerCase())
      )
    : activeGroup
      ? foodCategories.filter(fc => fc.group_ko === activeGroup)
      : foodCategories

  const pick = (id: string) => {
    onChange(id)
    setOpen(false)
    setSearch('')
    setActiveGroup('')
  }

  // ── 확정된 카테고리 ──
  if (confirmed) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: '#1a2a1a', border: '1px solid #3a4a3a',
        borderRadius: 20, padding: '4px 10px 4px 12px',
        fontSize: 12, color: '#6fcf97', ...F,
      }}>
        {confirmed.group_emoji} {confirmed.name_ko}
        <button
          onClick={() => onChange('')}
          style={{ ...btnBase, color: '#6fcf97', fontSize: 12, lineHeight: 1, padding: 0 }}
        >✕</button>
      </span>
    )
  }

  // ── 자동 추천 배지 ──
  if (suggestion) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 11, color: '#c8a96e', background: '#c8a96e15',
          border: '1px solid #c8a96e44', borderRadius: 20,
          padding: '3px 10px', ...F,
        }}>
          💡 {suggestion.name_ko} 자동추천
        </span>
        <button
          onClick={() => pick(suggestion.id)}
          style={{ ...btnBase, fontSize: 11, color: '#6fcf97', border: '1px solid #3a4a3a', borderRadius: 20, padding: '3px 10px', background: '#0d1a0d' }}
        >✓ 수락</button>
        <button
          onClick={() => { setDismissed(true); setOpen(true) }}
          style={{ ...btnBase, fontSize: 11, color: '#666', border: '1px solid #2a2a2a', borderRadius: 20, padding: '3px 10px', background: '#111' }}
        >직접 선택</button>
      </div>
    )
  }

  // ── 피커 닫힌 상태 (카테고리 없음) ──
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ ...btnBase, fontSize: 11, color: '#555', border: '1px dashed #2a2a2a', borderRadius: 20, padding: '4px 12px', background: '#0d0d0d' }}
      >
        + 카테고리 선택
      </button>
    )
  }

  // ── 피커 열린 상태 ──
  return (
    <div style={{
      background: '#0d0d0d', border: '1px solid #2a2a2a',
      borderRadius: 12, padding: 12, marginTop: 4,
    }}>
      {/* 검색 */}
      <input
        autoFocus
        value={search}
        onChange={e => { setSearch(e.target.value); setActiveGroup('') }}
        placeholder="카테고리 검색..."
        style={{
          width: '100%', background: '#141414', border: '1px solid #2a2a2a',
          borderRadius: 8, padding: '7px 12px', color: '#f0ece4', fontSize: 12,
          outline: 'none', boxSizing: 'border-box', ...F,
        }}
      />

      {/* 그룹 칩 (검색어 없을 때) */}
      {!search && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
          {groups.map(g => (
            <button
              key={g.key}
              onClick={() => setActiveGroup(prev => prev === g.key ? '' : g.key)}
              style={{
                ...btnBase,
                fontSize: 11, borderRadius: 16, padding: '4px 10px',
                background: activeGroup === g.key ? '#2a1a00' : '#141414',
                border: `1px solid ${activeGroup === g.key ? '#c8a96e' : '#2a2a2a'}`,
                color: activeGroup === g.key ? '#c8a96e' : '#666',
                fontWeight: activeGroup === g.key ? 700 : 400,
              }}
            >
              {g.emoji} {g.label}
            </button>
          ))}
        </div>
      )}

      {/* 카테고리 목록 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        {filtered.map(fc => (
          <button
            key={fc.id}
            onClick={() => pick(fc.id)}
            style={{
              ...btnBase,
              fontSize: 12, borderRadius: 20, padding: '5px 12px',
              background: '#141414', border: '1px solid #2a2a2a',
              color: '#c8a96e',
            }}
          >
            {fc.name_ko}
          </button>
        ))}
        {filtered.length === 0 && (
          <span style={{ fontSize: 12, color: '#444', ...F }}>검색 결과가 없어요</span>
        )}
      </div>

      {/* 닫기 */}
      <button
        onClick={() => { setOpen(false); setSearch(''); setActiveGroup('') }}
        style={{ ...btnBase, fontSize: 11, color: '#444', marginTop: 8 }}
      >
        ✕ 닫기
      </button>
    </div>
  )
}

/**
 * /api/trends — 오늘의 트렌드 음식 (네이버 DataLab / 구글 / 유튜브)
 *
 * Supabase 테이블 생성 SQL (한 번만 실행):
 *   create table if not exists daily_trends (
 *     id uuid primary key default gen_random_uuid(),
 *     date date unique not null,
 *     trends jsonb not null,
 *     updated_at timestamptz not null default now()
 *   );
 *
 * .env.local 에 아래 키 필요:
 *   NAVER_CLIENT_ID=
 *   NAVER_CLIENT_SECRET=
 *   YOUTUBE_API_KEY=  (선택)
 */

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// ── Naver DataLab 키워드 배치 (5개씩 최대 4배치) ─────────────────────────
const FOOD_BATCHES: string[][] = [
  ['라멘', '스시', '마라탕', '파스타', '삼겹살'],
  ['피자', '버거', '떡볶이', '비빔밥', '치킨'],
  ['쌀국수', '타코', '카레', '스테이크', '브런치'],
  ['짜장면', '짬뽕', '찌개', '냉면', '샐러드'],
]

// ── 날짜 헬퍼 ─────────────────────────────────────────────────────────────
function toYMD(d: Date) { return d.toISOString().slice(0, 10) }

// ── 네이버 DataLab ────────────────────────────────────────────────────────
export interface NaverTrendItem { keyword: string; score: number }

async function fetchNaverTrends(): Promise<NaverTrendItem[]> {
  const clientId = process.env.NAVER_CLIENT_ID
  const clientSecret = process.env.NAVER_CLIENT_SECRET
  if (!clientId || !clientSecret) return []

  const today = new Date()
  const endDate = toYMD(today)
  const startDate = toYMD(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000))

  const results: NaverTrendItem[] = []

  for (const batch of FOOD_BATCHES) {
    try {
      const res = await fetch('https://openapi.naver.com/v1/datalab/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
        },
        body: JSON.stringify({
          startDate,
          endDate,
          timeUnit: 'date',
          keywordGroups: batch.map(k => ({ groupName: k, keywords: [k] })),
        }),
        next: { revalidate: 0 },
      })
      const data = await res.json()
      if (!Array.isArray(data.results)) continue

      for (const item of data.results) {
        const values: number[] = item.data.map((d: { ratio: number }) => d.ratio)
        if (values.length === 0) continue
        const avg = values.reduce((a, b) => a + b, 0) / values.length
        const last = values[values.length - 1]
        // 트렌드 점수 = 최근 대비 평균 (1보다 크면 상승 중)
        const score = avg > 0 ? Math.round((last / avg) * 100) / 100 : 0
        results.push({ keyword: item.title as string, score })
      }
    } catch {
      // 배치 실패 시 continue
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 12)
}

// ── 구글 트렌드 (공개 RSS) ────────────────────────────────────────────────
export interface GoogleTrendItem { keyword: string; traffic?: string }

// 음식 관련 키워드 필터
const FOOD_HINTS = ['맛집', '먹방', '레시피', '음식', '식당', '카페', '배달', '치킨', '피자', '라멘', '스시', '파스타', '떡볶이', '삼겹살', '국밥', '냉면', '커피', '케이크', '베이커리', '쫄면', '마라탕', '타코', '우동', '소바', '덮밥', '비빔밥', '찌개', '샐러드', '버거']

function isFoodRelated(keyword: string): boolean {
  const lower = keyword.toLowerCase()
  return FOOD_HINTS.some(h => lower.includes(h)) ||
    /[맛먹식밥국죽탕면류빵과자술주|음갈탕찜볶조튀구이]/.test(keyword)
}

async function fetchGoogleTrends(): Promise<GoogleTrendItem[]> {
  try {
    const res = await fetch('https://trends.google.com/trending/rss?geo=KR', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
      next: { revalidate: 0 },
    })
    const xml = await res.text()

    // RSS 파싱 — CDATA 유무 모두 처리
    const items: GoogleTrendItem[] = []
    // <title>...</title> 또는 <title><![CDATA[...]]></title>
    const titleRe = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/g
    const trafficRe = /<ht:approx_traffic>([\s\S]*?)<\/ht:approx_traffic>/g
    const titles: string[] = []
    const traffics: string[] = []
    let m: RegExpExecArray | null

    // 첫 <title>은 채널 제목이므로 skip
    let first = true
    while ((m = titleRe.exec(xml)) !== null) {
      if (first) { first = false; continue }
      const t = m[1].trim()
      if (t) titles.push(t)
    }
    while ((m = trafficRe.exec(xml)) !== null) traffics.push(m[1].trim())

    for (let i = 0; i < titles.length; i++) {
      items.push({ keyword: titles[i], traffic: traffics[i] })
    }

    const foodItems = items.filter(item => isFoodRelated(item.keyword))
    // 음식 관련 항목 최대 8개, 부족하면 전체에서 추가로 채움
    const shown = [...foodItems]
    if (shown.length < 5) {
      for (const item of items) {
        if (!shown.find(s => s.keyword === item.keyword)) {
          shown.push(item)
          if (shown.length >= 8) break
        }
      }
    }
    return shown.slice(0, 10)
  } catch {
    return []
  }
}

// ── 유튜브 트렌드 ─────────────────────────────────────────────────────────
export interface YoutubeTrendItem { title: string; videoId: string; thumbnail: string; channelTitle: string }

async function fetchYoutubeTrends(): Promise<YoutubeTrendItem[]> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) return []

  try {
    // 한국 먹방/음식 관련 인기 동영상
    const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent('먹방 맛집 음식')}&order=viewCount&publishedAfter=${since}&regionCode=KR&maxResults=10&key=${apiKey}`
    const res = await fetch(url, { next: { revalidate: 0 } })
    const data = await res.json()
    if (!Array.isArray(data.items)) return []

    return data.items.map((item: {
      id: { videoId: string }
      snippet: { title: string; channelTitle: string; thumbnails: { default: { url: string } } }
    }) => ({
      title: item.snippet.title,
      videoId: item.id.videoId,
      channelTitle: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.default?.url || '',
    }))
  } catch {
    return []
  }
}

// ── GET handler ───────────────────────────────────────────────────────────
export async function GET() {
  const today = toYMD(new Date())

  // 캐시 확인
  const { data: cached } = await supabase
    .from('daily_trends')
    .select('*')
    .eq('date', today)
    .maybeSingle()

  const now = new Date()
  const cacheAgeH = cached
    ? (now.getTime() - new Date(cached.updated_at as string).getTime()) / 3_600_000
    : Infinity

  // 캐시 유효 + 네이버 데이터도 있으면 반환
  const cachedNaver = (cached?.trends as { naver?: unknown[] } | null)?.naver
  const naverKeysExist = !!(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET)
  const naverCacheEmpty = !cachedNaver || cachedNaver.length === 0
  if (cached && cacheAgeH < 23 && !(naverKeysExist && naverCacheEmpty)) {
    return NextResponse.json(cached.trends)
  }

  // 신규 fetch
  const [naver, google, youtube] = await Promise.all([
    fetchNaverTrends(),
    fetchGoogleTrends(),
    fetchYoutubeTrends(),
  ])

  const trends = { naver, google, youtube, fetchedAt: now.toISOString() }

  // Supabase upsert (date unique)
  await supabase
    .from('daily_trends')
    .upsert({ date: today, trends, updated_at: now.toISOString() }, { onConflict: 'date' })

  return NextResponse.json(trends)
}

import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const images = formData.getAll('images') as File[]
    if (!images.length) {
      return NextResponse.json({ success: false, error: '이미지가 없습니다' }, { status: 400 })
    }

    const imageContents = await Promise.all(
      images.map(async (img) => {
        const buffer = await img.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        return {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: (img.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp',
            data: base64,
          },
        }
      })
    )

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          ...imageContents,
          {
            type: 'text',
            text: `이 메뉴판 이미지들을 분석해서 아래 JSON 형식으로만 응답하세요.
마크다운 없이 순수 JSON만 출력하세요.

{
  "name": "가게명 한국어",
  "nameEn": "Store Name English",
  "emoji": "어울리는 이모지 1개",
  "categories": {
    "🍜 메인메뉴": ["메뉴1", "메뉴2"],
    "🥗 사이드메뉴": ["사이드1"],
    "➕ 추가토핑": ["토핑1"],
    "🥤 음료": ["음료1"]
  },
  "prices": { "메뉴1": "10,000" },
  "menuNames": {
    "메뉴1": { "ko": "메뉴1", "en": "Menu 1 in English" }
  },
  "menuOptions": {
    "메뉴1": [
      {
        "key": "option_key",
        "labelKo": "옵션명",
        "labelEn": "Option Name",
        "choices": [
          { "ko": "넣지않음", "en": "None" },
          { "ko": "선택지", "en": "Choice" }
        ]
      }
    ]
  }
}

규칙:
- 없는 카테고리는 빈 배열
- menuOptions는 선택 옵션이 있는 메뉴만
- 가격은 쉼표 포함 숫자만 (예: "12,000")`
          }
        ]
      }]
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
    const data = JSON.parse(cleaned)
    return NextResponse.json({ success: true, data })
  } catch (err: unknown) {
    console.error('AI extract error:', err)
    const message = err instanceof Error ? err.message : 'AI 처리 오류'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

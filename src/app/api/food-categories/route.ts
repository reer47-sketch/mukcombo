import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const { data, error } = await supabase
    .from('food_categories')
    .select('*')
    .order('sort_order', { nullsFirst: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH — 순서 일괄 저장
export async function PATCH(req: NextRequest) {
  const { updates } = await req.json() // [{ id, sort_order }]
  if (!Array.isArray(updates)) return NextResponse.json({ error: 'invalid' }, { status: 400 })
  const results = await Promise.all(
    updates.map(({ id, sort_order }: { id: string; sort_order: number }) =>
      supabase.from('food_categories').update({ sort_order }).eq('id', id)
    )
  )
  const err = results.find(r => r.error)
  if (err?.error) return NextResponse.json({ error: err.error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// POST — 새 범용 카테고리 추가 (어드민)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const id = body.name_ko
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9가-힣_]/g, '')
    .toLowerCase() + '_' + Date.now().toString().slice(-4)
  const { data, error } = await supabase
    .from('food_categories')
    .insert([{ id, name_ko: body.name_ko, name_en: body.name_en || body.name_ko }])
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE — 범용 카테고리 삭제 (어드민)
export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  const { error } = await supabase.from('food_categories').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

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

// PATCH — 순서 일괄 저장 / 카테고리 수정 / 대분류 수정
export async function PATCH(req: NextRequest) {
  const body = await req.json()

  // 순서 일괄 저장: { updates: [{ id, sort_order }] }
  if (Array.isArray(body.updates)) {
    const results = await Promise.all(
      body.updates.map(({ id, sort_order }: { id: string; sort_order: number }) =>
        supabase.from('food_categories').update({ sort_order }).eq('id', id)
      )
    )
    const err = results.find(r => r.error)
    if (err?.error) return NextResponse.json({ error: err.error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // 카테고리 단건 수정: { action: 'updateCategory', id, name_ko, name_en }
  if (body.action === 'updateCategory') {
    const { error } = await supabase
      .from('food_categories')
      .update({ name_ko: body.name_ko, name_en: body.name_en })
      .eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // 대분류 수정: { action: 'updateGroup', groupOld, ko, en, emoji }
  // group_ko가 groupOld인 모든 row의 group_ko/en/emoji를 일괄 변경
  if (body.action === 'updateGroup') {
    const { error } = await supabase
      .from('food_categories')
      .update({ group_ko: body.ko, group_en: body.en, group_emoji: body.emoji })
      .eq('group_ko', body.groupOld)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}

// POST — 새 범용 카테고리 추가 (어드민)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const id = body.name_ko
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9가-힣_]/g, '')
    .toLowerCase() + '_' + Date.now().toString().slice(-4)
  // 현재 최대 sort_order 조회 후 +1
  const { data: maxRow } = await supabase
    .from('food_categories')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()
  const sort_order = (maxRow?.sort_order ?? 0) + 1
  const { data, error } = await supabase
    .from('food_categories')
    .insert([{
      id,
      name_ko: body.name_ko,
      name_en: body.name_en || body.name_ko,
      group_ko: body.group_ko || '',
      group_en: body.group_en || '',
      group_emoji: body.group_emoji || '',
      sort_order,
    }])
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

import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const { data, error } = await supabase
    .from('food_categories')
    .select('*')
    .order('group_ko', { nullsFirst: true })
    .order('name_ko')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
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

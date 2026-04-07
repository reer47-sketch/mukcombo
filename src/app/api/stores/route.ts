import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '200'), 200)
  const offset = Math.max(parseInt(req.nextUrl.searchParams.get('offset') || '0'), 0)
  const { data, error } = await supabase
    .from('stores').select('*').order('created_at', { ascending: false }).range(offset, offset + limit - 1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await supabase
    .from('stores')
    .insert([{
      name: body.name, name_en: body.nameEn,
      emoji: body.emoji || '🍜',
      address: body.address || '', address_en: body.addressEn || '',
      map_url: body.mapUrl || '',
      categories: body.categories || {},
      prices: body.prices || {},
      menu_names: body.menuNames || {},
      menu_options: body.menuOptions || {},
    }])
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...updates } = body
  const { data, error } = await supabase
    .from('stores')
    .update({
      name: updates.name,
      name_en: updates.nameEn,
      categories: updates.categories,
      prices: updates.prices,
      menu_names: updates.menuNames,
      menu_options: updates.menuOptions,
    })
    .eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get('store_id')
  let query = supabase
    .from('posts')
    .select('*, comments(*)')
    .order('created_at', { ascending: false })
  if (storeId) query = query.eq('store_id', storeId)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await supabase
    .from('posts')
    .insert([{
      store_id: body.storeId,
      user_name: body.userName || '익명',
      avatar: body.avatar || '😊',
      items: body.items,
      side_items: body.sideItems || [],
      review: body.review,
      review_lang: body.reviewLang || 'ko',
      photo_url: body.photoUrl || null,
    }])
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const { id, delta } = await req.json()
  const { data: post } = await supabase
    .from('posts').select('likes').eq('id', id).single()
  const newLikes = Math.max(0, (post?.likes || 0) + delta)
  const { data, error } = await supabase
    .from('posts').update({ likes: newLikes }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

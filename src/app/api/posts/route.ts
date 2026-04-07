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
      user_id: body.userId || null,
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
  if (!id || (delta !== 1 && delta !== -1)) {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })
  }
  const { data: post } = await supabase
    .from('posts').select('likes').eq('id', id).single()
  if (!post) return NextResponse.json({ error: '게시글을 찾을 수 없어요' }, { status: 404 })
  const newLikes = Math.max(0, (post.likes || 0) + delta)
  const { data, error } = await supabase
    .from('posts').update({ likes: newLikes }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const { id, userId } = await req.json()
  const { data: post } = await supabase
    .from('posts').select('user_id').eq('id', id).single()
  if (!post) return NextResponse.json({ success: false, error: '게시글을 찾을 수 없어요' }, { status: 404 })
  if (post.user_id && post.user_id !== userId) {
    return NextResponse.json({ success: false, error: '본인 게시글만 삭제할 수 있어요' }, { status: 403 })
  }
  const { error } = await supabase.from('posts').delete().eq('id', id)
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

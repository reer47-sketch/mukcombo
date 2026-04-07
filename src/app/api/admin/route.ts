import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// Authorization: Bearer <supabase_access_token>
// 환경변수 ADMIN_EMAILS 에 포함된 이메일만 허용
async function verifyAdminSession(req: NextRequest): Promise<boolean> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return false

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user?.email) return false

  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean)
  return adminEmails.includes(user.email)
}

export async function POST(req: NextRequest) {
  if (!await verifyAdminSession(req)) {
    return NextResponse.json({ success: false, error: '권한 없음' }, { status: 403 })
  }

  const { action, ...body } = await req.json()

  // ── 가게 삭제 ──
  if (action === 'deleteStore') {
    const { error } = await supabase.from('stores').delete().eq('id', body.storeId)
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // ── 게시글 삭제 ──
  if (action === 'deletePost') {
    const { error } = await supabase.from('posts').delete().eq('id', body.postId)
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // ── 통계 ──
  if (action === 'stats') {
    const [stores, posts, users] = await Promise.all([
      supabase.from('stores').select('id, name', { count: 'exact' }),
      supabase.from('posts').select('id, store_id, likes, created_at', { count: 'exact' }),
      supabase.from('users').select('id, nickname, is_blocked, created_at', { count: 'exact' }),
    ])
    return NextResponse.json({
      success: true,
      stats: {
        storeCount: stores.count || 0,
        postCount: posts.count || 0,
        userCount: users.count || 0,
        stores: stores.data || [],
        posts: posts.data || [],
        users: users.data || [],
      }
    })
  }

  // ── 사용자 차단 ──
  if (action === 'blockUser') {
    const { error } = await supabase.from('users').update({ is_blocked: body.blocked }).eq('id', body.userId)
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ success: false, error: '알 수 없는 요청' }, { status: 400 })
}

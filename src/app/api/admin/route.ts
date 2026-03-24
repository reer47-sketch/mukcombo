import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/admin — 어드민 로그인 확인
export async function POST(req: NextRequest) {
  const { action, ...body } = await req.json()

  // ── 로그인 ──
  if (action === 'login') {
    const { username, password } = body
    const { data, error } = await supabase
      .from('admins')
      .select('id, username')
      .eq('username', username)
      .eq('password_hash', password)
      .single()
    if (error || !data) {
      return NextResponse.json({ success: false, error: '아이디 또는 비밀번호가 틀렸어요' }, { status: 401 })
    }
    return NextResponse.json({ success: true, admin: data })
  }

  // ── 가게 삭제 ──
  if (action === 'deleteStore') {
    const { storeId, username, password } = body
    // 어드민 검증
    const { data: admin } = await supabase
      .from('admins').select('id').eq('username', username).eq('password_hash', password).single()
    if (!admin) return NextResponse.json({ success: false, error: '권한 없음' }, { status: 403 })

    const { error } = await supabase.from('stores').delete().eq('id', storeId)
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // ── 게시글 삭제 ──
  if (action === 'deletePost') {
    const { postId, username, password } = body
    const { data: admin } = await supabase
      .from('admins').select('id').eq('username', username).eq('password_hash', password).single()
    if (!admin) return NextResponse.json({ success: false, error: '권한 없음' }, { status: 403 })

    const { error } = await supabase.from('posts').delete().eq('id', postId)
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // ── 통계 ──
  if (action === 'stats') {
    const { username, password } = body
    const { data: admin } = await supabase
      .from('admins').select('id').eq('username', username).eq('password_hash', password).single()
    if (!admin) return NextResponse.json({ success: false, error: '권한 없음' }, { status: 403 })

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
    const { userId, blocked, username, password } = body
    const { data: admin } = await supabase
      .from('admins').select('id').eq('username', username).eq('password_hash', password).single()
    if (!admin) return NextResponse.json({ success: false, error: '권한 없음' }, { status: 403 })

    const { error } = await supabase.from('users').update({ is_blocked: blocked }).eq('id', userId)
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ success: false, error: '알 수 없는 요청' }, { status: 400 })
}

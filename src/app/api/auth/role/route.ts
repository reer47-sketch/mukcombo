import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/auth/role
// Authorization: Bearer <supabase_access_token>
// → { role: 'admin' | 'owner', userId, email }
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ role: null }, { status: 401 })

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return NextResponse.json({ role: null }, { status: 401 })

  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean)

  if (user.email && adminEmails.includes(user.email)) {
    return NextResponse.json({ role: 'admin', userId: user.id, email: user.email })
  }

  // DB users 테이블에서 role 확인
  const { data: dbUser } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = dbUser?.role || 'user'

  return NextResponse.json({ role, userId: user.id, email: user.email })
}

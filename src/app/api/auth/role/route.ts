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

  return NextResponse.json({ role: 'owner', userId: user.id, email: user.email })
}

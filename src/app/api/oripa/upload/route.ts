import { NextRequest, NextResponse } from 'next/server'
import { supabase, createServiceClient } from '@/lib/supabase'

// POST /api/oripa/upload — 상품 이미지 업로드 (어드민 전용)
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean)
  if (!user.email || !adminEmails.includes(user.email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'no file' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const db = createServiceClient()
  const { error } = await db.storage
    .from('oripa-images')
    .upload(fileName, file, { contentType: file.type })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = db.storage.from('oripa-images').getPublicUrl(fileName)
  return NextResponse.json({ url: publicUrl })
}

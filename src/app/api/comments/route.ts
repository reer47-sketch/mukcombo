import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await supabase
    .from('comments')
    .insert([{
      post_id: body.postId,
      user_name: body.userName || '익명',
      avatar: body.avatar || '😊',
      text: body.text,
      text_lang: body.textLang || 'ko',
    }])
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

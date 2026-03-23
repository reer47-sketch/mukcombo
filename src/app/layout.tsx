import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '먹+콤보 | MukCombo',
  description: '맛집 메뉴 조합을 공유하는 커뮤니티',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}

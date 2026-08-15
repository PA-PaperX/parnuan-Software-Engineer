import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'รายการใช้จ่าย | Parnuan',
  description: 'ระบบแยกรายการใช้จ่ายจากข้อความภาษาไทย',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  )
}

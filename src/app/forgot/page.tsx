import '../login/page.css'
import ForgotClient from './ForgotClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Reset password · Implant ID',
}

export default function Page() {
  return <ForgotClient />
}

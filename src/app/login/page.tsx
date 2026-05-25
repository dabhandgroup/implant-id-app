import './page.css'
import LoginClient from './LoginClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Log in · Implant ID',
}

export default function Page() {
  return <LoginClient />
}

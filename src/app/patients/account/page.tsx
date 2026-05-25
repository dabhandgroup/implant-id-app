import './page.css'
import type { Metadata } from 'next'
import AccountClient from './AccountClient'

export const metadata: Metadata = {
  title: 'Account settings · Implant ID',
}

export default function Page() {
  return <AccountClient />
}

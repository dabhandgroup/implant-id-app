import './page.css'
import type { Metadata } from 'next'
import NotificationsClient from './NotificationsClient'

export const metadata: Metadata = {
  title: 'Notifications · Implant ID',
}

export const dynamic = 'force-dynamic'

export default function Page() {
  return <NotificationsClient />
}

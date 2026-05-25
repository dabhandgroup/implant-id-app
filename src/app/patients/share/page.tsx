import './page.css'
import type { Metadata } from 'next'
import ShareClient from './ShareClient'

export const metadata: Metadata = {
  title: 'Share with clinic · Implant ID',
}

export default function Page() {
  return <ShareClient />
}

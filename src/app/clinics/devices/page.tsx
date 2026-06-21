import './page.css'
import { Suspense }      from 'react'
import type { Metadata } from 'next'
import LibraryClient     from './LibraryClient'

export const metadata: Metadata = { title: 'Devices · Implant ID' }

export default function LibraryPage() {
  return (
    <Suspense fallback={null}>
      <LibraryClient />
    </Suspense>
  )
}

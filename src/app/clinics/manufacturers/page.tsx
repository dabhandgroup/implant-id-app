import './page.css'
import type { Metadata } from 'next'
import ManufacturersClient from './ManufacturersClient'

export const metadata: Metadata = { title: 'Manufacturers · Implant ID' }

export default function Page() {
  return <ManufacturersClient />
}

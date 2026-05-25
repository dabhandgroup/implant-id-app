import type { Metadata } from 'next'
import './page.css'
import RegisterClient from './RegisterClient'

export const metadata: Metadata = {
  title: 'Create your patient record · Implant ID',
}

export default function RegisterPage() {
  return <RegisterClient />
}

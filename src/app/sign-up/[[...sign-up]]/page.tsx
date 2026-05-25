import './page.css'
import type { Metadata } from 'next'
import SignUpClient from './SignUpClient'

export const metadata: Metadata = {
  title: 'Create your account · Implant ID',
}

export default function SignUpPage() {
  return <SignUpClient />
}

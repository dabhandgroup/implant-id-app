'use client'
import { AuthenticateWithRedirectCallback } from '@clerk/nextjs'

export default function SSOCallbackClient() {
  return <AuthenticateWithRedirectCallback />
}

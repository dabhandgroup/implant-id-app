import { Suspense } from 'react'
import ScanClient from './ScanClient'
export const dynamic = 'force-dynamic'
export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  return <Suspense fallback={null}><ScanClient code={code} /></Suspense>
}

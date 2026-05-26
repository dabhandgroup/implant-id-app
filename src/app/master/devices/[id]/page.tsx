export const dynamic = 'force-dynamic'

import DeviceDetailClient from './DeviceDetailClient'

export default async function DeviceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <DeviceDetailClient id={id} />
}

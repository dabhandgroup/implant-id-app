export const dynamic = 'force-dynamic'
import ManufacturerClient from './ManufacturerClient'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ManufacturerClient id={id} />
}

export const dynamic = 'force-dynamic'
import ApplicationClient from './ApplicationClient'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ApplicationClient id={id} />
}

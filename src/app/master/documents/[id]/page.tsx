export const dynamic = 'force-dynamic'

import DocumentDetailClient from './DocumentDetailClient'

export default async function MasterDocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <DocumentDetailClient id={id} />
}

export const dynamic = 'force-dynamic'

import DocumentDetailClient from './DocumentDetailClient'

export default function MasterDocumentDetailPage({ params }: { params: { id: string } }) {
  return <DocumentDetailClient id={params.id} />
}

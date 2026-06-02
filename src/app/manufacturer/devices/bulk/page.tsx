import type { Metadata } from 'next'
import { Suspense }      from 'react'
// Reuses the same bulk upload client — returnUrl points back to manufacturer devices
import BulkUploadClient  from '../../../master/devices/bulk/BulkUploadClient'

export const metadata: Metadata = { title: 'Bulk Upload Devices · Implant ID' }
export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <Suspense>
      <BulkUploadClient returnUrl="/manufacturer/devices" />
    </Suspense>
  )
}

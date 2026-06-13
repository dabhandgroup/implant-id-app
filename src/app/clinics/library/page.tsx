import './page.css'
import { Suspense }     from 'react'
import type { Metadata } from 'next'
import { ALL_DEVICES, MANUFACTURERS } from '@/data/devices'
import LibraryClient, { type LibDevice } from './LibraryClient'

export const metadata: Metadata = { title: 'Implant library · Implant ID' }

export default async function LibraryPage() {
  const devices: LibDevice[] = ALL_DEVICES.map(d => {
    const mfr = MANUFACTURERS.find(m => m.manufacturer_id === d.manufacturer_id)
    return {
      device_id:          d.device_id,
      device_name:        d.device_name,
      model_number:       d.model_number,
      device_type:        d.device_type,
      component_role:     d.component_role,
      mri_classification: d.mri_classification,
      field_strength_1t5: d.field_strength_1t5,
      field_strength_3t:  d.field_strength_3t,
      manufacturer_id:    d.manufacturer_id,
      manufacturer_name:  mfr?.common_name ?? d.manufacturer_id,
      _category:          d._category,
    }
  })

  return (
    <Suspense fallback={null}>
      <LibraryClient devices={devices} userName="" userInitials="" />
    </Suspense>
  )
}

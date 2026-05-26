export const metadata = { title: 'Documents · Master Admin · Implant ID' }
export const dynamic = 'force-dynamic'

export default function MasterDocumentsPage() {
  const docs = [
    {
      id: 1,
      name: 'Medtronic_Micra_AV_MRI_Conditions.pdf',
      type: 'MRI Conditions',
      manufacturer: 'Medtronic plc',
      device: 'Micra AV Pacemaker',
      uploaded: '12 Jan 2026',
    },
    {
      id: 2,
      name: 'ZimmerBiomet_Oxford_Knee_IFU.pdf',
      type: 'Instructions for Use',
      manufacturer: 'Zimmer Biomet',
      device: 'Oxford Knee System',
      uploaded: '16 Jan 2026',
    },
    {
      id: 3,
      name: 'Stryker_Tritanium_PL_ProductLeaflet.pdf',
      type: 'Product Leaflet',
      manufacturer: 'Stryker Orthopaedics',
      device: 'Tritanium PL Cage',
      uploaded: '22 Feb 2026',
    },
    {
      id: 4,
      name: 'Medtronic_RevealLINQ_IFU.pdf',
      type: 'Instructions for Use',
      manufacturer: 'Medtronic plc',
      device: 'Reveal LINQ ICM',
      uploaded: '12 Jan 2026',
    },
    {
      id: 5,
      name: 'Zimmer_PersonaKnee_MRI_Cert.pdf',
      type: 'MRI Conditions',
      manufacturer: 'Zimmer Biomet',
      device: 'Persona Knee System',
      uploaded: '18 Jan 2026',
    },
    {
      id: 6,
      name: 'Stryker_Accolade2_DeviceContract.pdf',
      type: 'Device Contract',
      manufacturer: 'Stryker Orthopaedics',
      device: 'Accolade II Hip Stem',
      uploaded: '22 Feb 2026',
    },
  ]

  function typeColour(type: string) {
    if (type === 'MRI Conditions') return { bg: 'color-mix(in srgb,#3b82f6 10%,transparent)', border: 'color-mix(in srgb,#3b82f6 25%,transparent)', text: '#3b82f6' }
    if (type === 'Instructions for Use') return { bg: 'color-mix(in srgb,var(--ok) 10%,transparent)', border: 'color-mix(in srgb,var(--ok) 25%,transparent)', text: 'var(--ok)' }
    if (type === 'Device Contract') return { bg: 'color-mix(in srgb,var(--accent) 10%,transparent)', border: 'color-mix(in srgb,var(--accent) 25%,transparent)', text: 'var(--accent)' }
    return { bg: 'color-mix(in srgb,var(--muted) 10%,transparent)', border: 'color-mix(in srgb,var(--muted) 25%,transparent)', text: 'var(--muted)' }
  }

  return (
    <div className="m-content">
      <div className="m-h">
        <div>
          <h2>Documents</h2>
          <div className="sub">Signed submission contracts auto-generated when manufacturers submit devices. Each PDF contains the full device record, manufacturer details, and the uploader&apos;s electronic signature.</div>
        </div>
      </div>

      <div className="m-tbl-toolbar">
        <div className="search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" placeholder="Search documents, manufacturers…" />
        </div>
        <button className="m-act">Filter by type</button>
      </div>

      <div className="m-tbl-wrap">
        <table className="m-tbl">
          <thead>
            <tr>
              <th>Document</th>
              <th>Type</th>
              <th>Manufacturer</th>
              <th>Device</th>
              <th>Uploaded</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {docs.map(doc => {
              const colours = typeColour(doc.type)
              return (
                <tr key={doc.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: 'color-mix(in srgb,var(--err) 10%,transparent)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="1.7">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                      </div>
                      <span style={{ fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{doc.name}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--ff)', fontSize: 11.5, fontWeight: 600, background: colours.bg, border: `1px solid ${colours.border}`, color: colours.text, borderRadius: 7, padding: '3px 9px', whiteSpace: 'nowrap' }}>
                      {doc.type}
                    </span>
                  </td>
                  <td style={{ color: 'var(--muted)' }}>{doc.manufacturer}</td>
                  <td>{doc.device}</td>
                  <td style={{ color: 'var(--muted)' }}>{doc.uploaded}</td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button className="m-act">View</button>
                    <button className="m-act">Download</button>
                    <button className="m-act danger">Delete</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

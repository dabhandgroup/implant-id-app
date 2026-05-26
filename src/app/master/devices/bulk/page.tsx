export const metadata = { title: 'Bulk Upload · Master Admin · Implant ID' }

export default function MasterBulkUploadPage() {
  return (
    <div className="m-content">
      <div className="m-h">
        <div>
          <h2>Bulk Upload</h2>
          <div className="sub">Import multiple devices from a CSV or Excel file.</div>
        </div>
        <a href="/master/devices" className="btn">← Back to Devices</a>
      </div>

      {/* Step 1 — Upload */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 26px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 600, fontFamily: 'var(--ff)', flexShrink: 0 }}>1</div>
          <h3 style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 600 }}>Upload your file</h3>
        </div>
        <div style={{ background: 'var(--bg)', border: '2px dashed var(--border2)', borderRadius: 12, padding: '42px 20px', textAlign: 'center', cursor: 'pointer' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" style={{ margin: '0 auto 12px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <h4 style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 500, marginBottom: 6 }}>Drop your CSV here or click to browse</h4>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 14 }}>Accepts .csv, .xlsx, .xls — max 10 MB</p>
          <a style={{ color: 'var(--accent)', textDecoration: 'underline', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Download template CSV</a>
        </div>
      </div>

      {/* Step 2 — Map columns (greyed out until file uploaded) */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 26px', marginBottom: 14, opacity: 0.45 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--muted2)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 600, fontFamily: 'var(--ff)', flexShrink: 0 }}>2</div>
          <h3 style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 600 }}>Map columns</h3>
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.4px' }}>Waiting for file</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Upload a file above to map its columns to the Implant ID schema.</p>
      </div>

      {/* Step 3 — Validate & import */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 26px', opacity: 0.45 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--muted2)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 600, fontFamily: 'var(--ff)', flexShrink: 0 }}>3</div>
          <h3 style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 600 }}>Validate &amp; import</h3>
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Review validation results and confirm the import.</p>
      </div>
    </div>
  )
}

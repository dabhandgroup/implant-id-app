export const metadata = { title: 'Add Device · Master Admin · Implant ID' }

export default function MasterAddDevicePage() {
  return (
    <div className="m-content">
      <div className="m-h">
        <div>
          <h2>Add Device</h2>
          <div className="sub">Manually add a new implant device to the catalogue.</div>
        </div>
        <a href="/master/devices" className="btn">← Back to Devices</a>
      </div>

      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '32px 36px', maxWidth: 760 }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600, fontFamily: 'var(--ff)', flexShrink: 0 }}>1</div>
            <h3 style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 600 }}>Device Identity</h3>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 18, paddingLeft: 32 }}>Core identifying information for this device.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="field"><label>Device Name <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label><input className="input" type="text" placeholder="e.g. Medtronic Micra AV" /></div>
            <div className="field"><label>Manufacturer <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label><input className="input" type="text" placeholder="e.g. Medtronic" /></div>
            <div className="field"><label>Model Number <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label><input className="input" type="text" placeholder="e.g. MC1AVR1" /></div>
            <div className="field"><label>Category <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label><input className="input" type="text" placeholder="e.g. Cardiac Pacemaker" /></div>
            <div className="field" style={{ gridColumn: '1/-1' }}><label>Description</label><textarea className="input" style={{ resize: 'vertical', minHeight: 80 }} placeholder="Brief clinical description of the device and its indication…" /></div>
          </div>
        </div>

        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600, fontFamily: 'var(--ff)', flexShrink: 0 }}>2</div>
            <h3 style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 600 }}>MRI Compatibility</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, paddingLeft: 32 }}>
            <div className="field"><label>MRI Conditional</label><input className="input" type="text" placeholder="Yes / No / Conditional" /></div>
            <div className="field"><label>Tesla Rating</label><input className="input" type="text" placeholder="e.g. 1.5T, 3T" /></div>
            <div className="field"><label>SAR Limit</label><input className="input" type="text" placeholder="e.g. 2 W/kg" /></div>
          </div>
        </div>

        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600, fontFamily: 'var(--ff)', flexShrink: 0 }}>3</div>
            <h3 style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 600 }}>Supporting Documents</h3>
          </div>
          <div style={{ paddingLeft: 32 }}>
            <div style={{ background: 'var(--bg)', border: '2px dashed var(--border2)', borderRadius: 12, padding: '28px 20px', textAlign: 'center', cursor: 'pointer' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--muted2)" strokeWidth="1.5" style={{ margin: '0 auto 10px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <p style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Drop PDF here or click to browse</p>
              <p style={{ fontSize: 12.5, color: 'var(--muted)' }}>MRI conditions PDF, IFU, and product leaflet accepted</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <a href="/master/devices" className="btn">Cancel</a>
          <button className="btn btn-s">Add Device →</button>
        </div>
      </div>
    </div>
  )
}

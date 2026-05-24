window.addEventListener('DOMContentLoaded', function(){
  const params = new URLSearchParams(location.search);
  let mn = params.get('mn');
  if (!mn) { var p = location.pathname.split('/'); if (p[1]==='device' && p[2]) mn = decodeURIComponent(p[2]); }
  const d = IMPLANTS.find(i => i.mn === mn || (i.model_numbers && i.model_numbers.includes(mn)));
  const page = document.getElementById('page');
  if (!d){
    page.innerHTML = '<div style="padding:120px 32px;text-align:center;color:var(--muted);font-family:var(--ff)"><h1 style="font-size:24px;margin-bottom:10px">Device not found</h1><p>Couldn\u2019t find an implant with that model number.</p><p style="margin-top:16px"><a href="/library" class="btn">\u2190 Back to library</a></p></div>';
    return;
  }
  document.title = d.n + ' (' + d.mn + ') · Implant ID';
  const cat = ((d.chamber ? d.chamber + '-chamber ' : '') + (TYPE_LABEL[d.t]||'') + (d.sub ? ' ' + d.sub : '')).trim();
  const statusCls = d.statusClass || 'ok';

  function leadBlock(title, icon, items){
    if (!items || !items.length) return '';
    return '<div class="dev-lead-hd">' + title + '</div><ul class="dev-leads">' + items.map(x => '<li>' + x + '</li>').join('') + '</ul>';
  }

  const openInfo = `
    <div class="dev-kv">
      <div class="k">Manufacturer</div><div class="v">${d.mfr}</div>
      <div class="k">Device name</div><div class="v">${d.n}</div>
      <div class="k">Model number</div><div class="v">${d.mn}</div>
      <div class="k">Category</div><div class="v">${cat}</div>
      <div class="k">MRI status</div><div class="v"><span class="pill pill-${statusCls}">${d.status}</span></div>
      <div class="k">Last verified</div><div class="v">${META_COMMON.verified}</div>
    </div>
    <div style="margin-top:18px;padding-top:16px;border-top:1px solid var(--border);font-family:var(--ff);font-size:12px;color:var(--muted2);line-height:1.6">
      Data sourced from ${d.mfr} manufacturer documentation. Always confirm against the original manual before proceeding with a scan.
    </div>`;

  function sarStr(wb, head) {
    if (!wb && !head) return '—';
    if (wb && head) return `${wb} W/kg (WB) / ${head} W/kg (head)`;
    return `${wb || head} W/kg`;
  }
  function fieldStr(d) {
    const f = [];
    if (d.field_strength_1t5) f.push('1.5T');
    if (d.field_strength_3t) f.push('3T');
    if (d.field_strength_7t) f.push('7T');
    return f.length ? f.join(' + ') : 'None / MR Unsafe';
  }
  const gatedInfo = `
    <div class="dev-kv">
      <div class="k">MRI classification</div><div class="v">${d.mri_classification || d.status}</div>
      <div class="k">Field strengths permitted</div><div class="v">${fieldStr(d)}</div>
      <div class="k">Max SAR — Region A (above C7)</div><div class="v">${sarStr(d.regionA_max_sar_wb, d.regionA_max_sar_head)}</div>
      <div class="k">Max SAR — Region B (below C7)</div><div class="v">${sarStr(d.regionB_max_sar_wb, d.regionB_max_sar_head)}</div>
      <div class="k">RF transmit mode</div><div class="v">${d.rf_transmit_mode || '—'}</div>
      <div class="k">Scan region permitted</div><div class="v">${d.scan_region_permitted || '—'}</div>
      <div class="k">Orientation restriction</div><div class="v">${d.orientation_restriction || 'None'}</div>
      ${d.max_scan_time_mins ? `<div class="k">Max scan time</div><div class="v">${d.max_scan_time_mins} minutes</div>` : ''}
      ${d.post_implant_wait_weeks != null ? `<div class="k">Post-implant wait</div><div class="v">${d.post_implant_wait_weeks === 0 ? 'None required' : d.post_implant_wait_weeks + ' weeks'}</div>` : ''}
      ${d.prescan_programming_required ? `<div class="k">Prescan programming</div><div class="v">Required</div>` : ''}
      ${d.rep_required ? `<div class="k">Rep required</div><div class="v">Yes — manufacturer rep must be present</div>` : ''}
      ${d.magnet_removal_required ? `<div class="k">Magnet removal</div><div class="v">May be required — assess per patient</div>` : ''}
      <div class="k">Active recall</div><div class="v">None on record</div>
      <div class="k">Last verified</div><div class="v">${META_COMMON.verified}</div>
    </div>
    ${d.scan_region_notes ? `<div style="margin-top:14px;padding:12px 14px;background:#f5f9fb;border-radius:8px;font-size:12px;color:var(--muted);line-height:1.6">${d.scan_region_notes}</div>` : ''}
  `;

  page.innerHTML = `
  <section class="dev-hero">
    <div class="ct">
      <a class="dev-back" href="/library">← Back to library</a>
      <div class="dev-g">
        <div class="dev-img">
          ${DEVICE_SVG(d.t)}
          <span class="cls" style="background:var(--ok)">✓ Verified</span>
        </div>
        <div class="dev-side">
          <div class="cat">${cat}</div>
          <h1>${d.n}</h1>
          <div class="mn">Model ${d.mn}${d.sub?' · '+d.sub:''} · ${d.mfr}</div>
          <div class="dev-actions">
            <button onclick="openSignIn()" class="btn">Unlock full record →</button>
            <a href="login.html" class="btn btn-o">I have an account</a>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="dev-body">
    <div class="ct">
      <div class="dev-grid">
        <!-- OVERVIEW: fully visible -->
        <div class="dev-card">
          <h3><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg> Device overview</h3>
          ${openInfo}
        </div>

        <!-- LOCKED SECTION: sticky CTA left + preview cards right -->
        <div class="dev-locked">
          <div class="dev-sticky">
            <div class="gate-cta">
              <div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg></div>
              <h4>Unlock full record</h4>
              <p>MRI safety parameters, lead compatibility, manufacturer manuals, and recall history — free for clinicians.</p>
              <div class="btns">
                <a href="register-clinic.html" class="btn btn-s">Start free trial →</a>
                <a href="login.html" class="btn">I have an account</a>
              </div>
              <div class="trust">
                <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> HIPAA</span>
                <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4"/></svg> SOC 2</span>
                <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/></svg> GDPR</span>
              </div>
            </div>
          </div>

          <div class="locked-cards">
            <div class="locked-card">
              <h3><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> MRI safety parameters</h3>
              <div class="lock-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
              <div class="preview">${gatedInfo}</div>
            </div>

            <div class="locked-card">
              <h3><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg> Manufacturer documents</h3>
              <div class="lock-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
              <div class="preview">
                <ul class="dev-leads">
                  <li><b>${d.mfr} — MRI Safety Information</b><br><span style="font-size:12px">PDF · 2.1 MB</span></li>
                  <li><b>${d.n} — Clinician's Manual</b><br><span style="font-size:12px">PDF · 5.8 MB</span></li>
                  <li><b>Patient information leaflet</b><br><span style="font-size:12px">PDF · 860 KB</span></li>
                </ul>
              </div>
            </div>

            <div class="locked-card">
              <h3><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Recall history</h3>
              <div class="lock-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
              <div class="preview">
                <div style="font-family:var(--ff);font-size:13px;color:var(--muted)">No active recalls · Last checked 14 Apr 2026</div>
              </div>
            </div>

            <div class="locked-card">
              <h3><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> Related devices</h3>
              <div class="lock-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
              <div class="preview" id="related"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
  `;

  // Related devices — same category + same manufacturer
  const related = IMPLANTS.filter(i => i.mn !== d.mn && i.t === d.t && i.mfr === d.mfr).slice(0, 4);
  const rel = document.getElementById('related');
  if (related.length){
    rel.innerHTML = related.map(i => `
      <a href="/device?mn=${encodeURIComponent(i.mn)}" style="display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid var(--border);border-radius:10px;margin-bottom:8px;text-decoration:none;color:var(--text);transition:all .15s">
        <div style="width:48px;height:36px;border-radius:7px;background:linear-gradient(160deg,#f0f5f8,#d9e6ec);overflow:hidden;flex-shrink:0;padding:2px">${DEVICE_SVG(i.t)}</div>
        <div style="flex:1;min-width:0">
          <div style="font-family:var(--ff);font-weight:500;font-size:13.5px;letter-spacing:-.01em">${i.n}</div>
          <div style="font-family:var(--ff);font-size:11.5px;color:var(--muted2);margin-top:2px">Model ${i.mn}</div>
        </div>
        <div style="color:var(--muted2);font-size:18px">›</div>
      </a>
    `).join('');
  } else {
    rel.innerHTML = '<div style="color:var(--muted);font-size:13px">No similar devices in the catalogue yet.</div>';
  }
});
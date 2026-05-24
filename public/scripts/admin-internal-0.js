let EDITING = null;
let FILTERED = [];

const TYPE_NAMES = {pacemaker:'Pacemaker',lead:'Pacing lead',cochlear:'Cochlear implant',dbs:'Deep brain stimulator',scs:'Spinal cord stimulator',stent:'Stent',legacy:'Legacy device',leadless:'Leadless',crtp:'CRT-P',crtd:'CRT-D',icd:'ICD',sicd:'S-ICD',evicd:'EV-ICD',monitor:'Monitor'};

function setPane(name, btn){
  document.querySelectorAll('.sb-link[data-pane]').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  else {
    var link = document.querySelector('.sb-link[data-pane="'+name+'"]');
    if (link) link.classList.add('active');
  }
  document.querySelectorAll('.adm-pane').forEach(p=>p.classList.remove('on'));
  document.getElementById('p-'+name).classList.add('on');
  const titles = {devices:['Devices','Manage every implant record. Attach PDFs, set MRI parameters, sync from manufacturers.'],brands:['Brands & manufacturers','Onboard new manufacturers and configure sync sources.'],pdfs:['PDF library','Upload manuals, safety sheets, patient leaflets. Auto-tagged by model.'],import:['Import & sync','Bulk import from CSV, XLSX, or Google Sheets.'],audit:['Audit log','Every admin action, every sync, every edit — immutable trail.']};
  document.getElementById('pane-title').textContent = titles[name][0];
  document.getElementById('pane-sub').textContent = titles[name][1];
  document.getElementById('pane-acts').style.display = (name === 'devices') ? 'flex' : 'none';
  // Close mobile drawer + scroll up
  if (window.innerWidth < 900){
    var sb = document.querySelector('.sidebar');
    if (sb) sb.classList.remove('open');
    var b = document.getElementById('sb-back');
    if (b) b.classList.remove('on');
    document.body.style.overflow = '';
  }
  window.scrollTo({top:0,behavior:'instant'});
}

// Wire sb-link clicks to setPane
document.querySelectorAll('.sb-link[data-pane]').forEach(function(a){
  a.addEventListener('click', function(e){
    e.preventDefault();
    setPane(a.dataset.pane, a);
  });
});

// Sidebar collapse toggle (desktop)
function toggleSb(){
  document.getElementById('app').classList.toggle('collapsed');
  try{localStorage.setItem('iid-sb-adm', document.getElementById('app').classList.contains('collapsed')?'1':'0')}catch(e){}
}
try{ if (localStorage.getItem('iid-sb-adm')==='1') document.getElementById('app').classList.add('collapsed'); }catch(e){}

// Bottom user dropdown
document.getElementById('adm-bot').addEventListener('click', function(e){
  document.getElementById('adm-profile-menu').classList.toggle('open');
  e.stopPropagation();
});
document.addEventListener('click', function(e){
  var m = document.getElementById('adm-profile-menu');
  if (m && !e.target.closest('#adm-bot') && !e.target.closest('#adm-profile-menu')) m.classList.remove('open');
});

function render(){
  const q = (document.getElementById('adm-q').value || '').toLowerCase().trim();
  const mf = document.getElementById('adm-mfr-f').value;
  const tf = document.getElementById('adm-type-f').value;
  FILTERED = IMPLANTS.filter(i => {
    if (mf !== 'all' && i.mfr !== mf) return false;
    if (tf !== 'all' && i.t !== tf) return false;
    if (!q) return true;
    return (i.n + ' ' + i.mn + ' ' + i.mfr).toLowerCase().includes(q);
  });
  const el = document.getElementById('adm-table');
  el.innerHTML = `
    <div class="adm-row adm-thead">
      <div><input type="checkbox"></div>
      <div>Device</div>
      <div>Manufacturer</div>
      <div>Category</div>
      <div>MRI status</div>
      <div>Updated</div>
      <div></div>
    </div>` + FILTERED.map((d, idx) => `
      <div class="adm-row">
        <div><input type="checkbox"></div>
        <div class="dev">
          <div class="dev-ic">${DEVICE_SVG(d.t)}</div>
          <div><div class="dev-nm">${d.n}${d.sub?' <span style="color:var(--muted2);font-weight:400">· '+d.sub+'</span>':''}</div><div class="dev-mn">${d.mn}${d.chamber?' · '+d.chamber:''}</div></div>
        </div>
        <div>${d.mfr}</div>
        <div>${TYPE_NAMES[d.t] || d.t}</div>
        <div><span class="pill pill-${d.statusClass}">${d.status}</span></div>
        <div style="color:var(--muted)">${META_COMMON.verified}</div>
        <div class="act-btns">
          <button onclick="openEdit(${idx})" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button>
          <button title="Attach PDF"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21.44 11.05 12.25 20.24a5.5 5.5 0 0 1-7.78-7.78l8.49-8.49a3.67 3.67 0 0 1 5.19 5.19L9.66 17.66a1.83 1.83 0 0 1-2.6-2.6L15.07 7"/></svg></button>
          <button class="del" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14H7L5 6M10 11v6M14 11v6M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg></button>
        </div>
      </div>
    `).join('');
}

function openEdit(idx){
  const d = (idx === null || idx === undefined) ? {n:'',mfr:'Medtronic',mn:'',t:'pacemaker',sub:'',status:'MR Conditional 1.5T / 3T'} : FILTERED[idx];
  EDITING = idx;
  document.getElementById('edit-title').textContent = idx === null ? 'Add a new device' : 'Edit device';
  document.getElementById('edit-meta').textContent = idx === null ? 'New device · not saved' : 'Last updated ' + META_COMMON.verified + ' · synced from source';
  document.getElementById('e-n').value = d.n || '';
  document.getElementById('e-mfr').value = d.mfr || 'Medtronic';
  document.getElementById('e-mn').value = d.mn || '';
  document.getElementById('e-t').value = d.t || 'pacemaker';
  document.getElementById('e-sub').value = d.sub || '';
  document.getElementById('e-st').value = d.status || 'MR Conditional 1.5T / 3T';
  document.getElementById('e-leads').value = (d.leads || []).join('\n');
  document.getElementById('e-defib').value = (d.defibLeads || []).join('\n');
  document.getElementById('e-crt').value = (d.crtLeads || []).join('\n');
  document.getElementById('edit-back').classList.add('open');
  document.getElementById('edit-panel').classList.add('open');
}
function closeEdit(){ document.getElementById('edit-back').classList.remove('open'); document.getElementById('edit-panel').classList.remove('open'); }
function saveEdit(){ alert('Demo: in production this writes to the Convex database.'); closeEdit(); }

function exportCsv(){
  const rows = [['Manufacturer','Name','Model','Sub','Category','Chamber','MRI Status','Max SAR','Verified']];
  IMPLANTS.forEach(d => rows.push([d.mfr, d.n, d.mn, d.sub||'', TYPE_NAMES[d.t]||d.t, d.chamber||'', d.status, META_COMMON.sar, META_COMMON.verified]));
  const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g,'""') + '"').join(',')).join('\n');
  downloadBlob(csv, 'implant-id-catalogue.csv', 'text/csv');
}
function exportJson(){
  downloadBlob(JSON.stringify(IMPLANTS, null, 2), 'implant-id-catalogue.json', 'application/json');
}
function downloadBlob(content, filename, type){
  const blob = new Blob([content], {type:type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 200);
}

function addPdfs(files){
  const list = document.getElementById('pdf-list');
  [].slice.call(files).forEach(f => {
    const div = document.createElement('div');
    div.className = 'adm-pdf';
    div.innerHTML = `<div class="pdf-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg></div><div><div class="pdf-nm">${f.name}</div><div class="pdf-meta">Just uploaded · ${(f.size/1024/1024).toFixed(1)} MB · Tag a model</div></div><span class="pill pill-warn">Tag needed</span><div class="act-btns"><button class="btn">Tag</button><button class="btn">Remove</button></div>`;
    list.prepend(div);
  });
}

document.addEventListener('DOMContentLoaded', function(){
  // Populate stats
  const total = IMPLANTS.length;
  const active = IMPLANTS.filter(i => i.category === 'active').length;
  const passive = IMPLANTS.filter(i => i.category === 'passive').length;
  const legacy = IMPLANTS.filter(i => i.category === 'legacy').length;
  const stEl = document.getElementById('st-total'); if (stEl) stEl.textContent = total;
  const saEl = document.getElementById('st-active'); if (saEl) saEl.textContent = active;
  const spEl = document.getElementById('st-passive'); if (spEl) spEl.textContent = passive;
  const slEl = document.getElementById('st-legacy'); if (slEl) slEl.textContent = legacy;
  // legacy compat
  const stMdt = document.getElementById('st-mdt'); if (stMdt) stMdt.textContent = IMPLANTS.filter(i => i.mfr === 'Medtronic').length;
  const stBsc = document.getElementById('st-bsc'); if (stBsc) stBsc.textContent = IMPLANTS.filter(i => i.mfr === 'Boston Scientific').length;
  render();
  document.getElementById('adm-q').addEventListener('input', render);
  document.getElementById('adm-mfr-f').addEventListener('change', render);
  document.getElementById('adm-type-f').addEventListener('change', render);
  document.addEventListener('click', function(e){
    const d = document.getElementById('dd-export');
    if (d && !d.contains(e.target)) d.classList.remove('open');
  });
  document.addEventListener('keydown', function(e){ if (e.key==='Escape'){ closeEdit(); }});
});
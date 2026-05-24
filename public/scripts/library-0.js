function categoryLabel(i){
  const chamber = i.chamber ? `${i.chamber}-chamber ` : '';
  const sub = i.sub ? ` ${i.sub}` : '';
  const base = (TYPE_LABEL[i.t]||'');
  return (chamber + base + sub).trim();
}
function deviceUrl(i){ return '/device?mn=' + encodeURIComponent(i.mn); }

let curFilt = 'all', curMfr = 'all', curView = (localStorage.getItem('iid-view') || 'grid');

function render(){
  const q = (document.getElementById('libq').value||'').toLowerCase().trim();
  const list = IMPLANTS.filter(i => {
    if (curFilt !== 'all' && i.t !== curFilt) return false;
    if (curMfr !== 'all' && i.mfr !== curMfr) return false;
    if (!q) return true;
    const hay = (i.n + ' ' + i.mn + ' ' + i.mfr + ' ' + (i.chamber||'') + ' ' + categoryLabel(i)).toLowerCase();
    return hay.includes(q);
  });
  const el = document.getElementById('res-list');
  if (!list.length){
    el.className = '';
    el.innerHTML = '<div style="text-align:center;padding:56px;color:var(--muted);background:var(--bg2);border:1px solid var(--border);border-radius:14px">No matches. Try another filter or search term.</div>';
  } else if (curView === 'grid'){
    el.className = 'res-grid';
    el.innerHTML = list.map(i => {
      const statusCls = (i.statusClass==='warn'||i.statusClass==='err') ? i.statusClass : '';
      const shortStatus = i.status.replace('MR Conditional ','').replace(' ','\u00A0');
      return `<a class="res-card" href="${deviceUrl(i)}">
        <div class="res-card-img">
          ${DEVICE_SVG(i.t)}
          <span class="mfr-tag">${i.mfr.length > 10 ? i.mfr.split(' ')[0] : i.mfr}</span>
          <span class="cls-tag ${statusCls}">${shortStatus}</span>
        </div>
        <div class="res-card-body">
          <span class="cat">${categoryLabel(i)}</span>
          <span class="nm">${i.n}</span>
          <span class="mn">Model ${i.mn}</span>
          <span class="st ${statusCls}">${i.status}</span>
        </div>
      </a>`;
    }).join('');
  } else {
    el.className = '';
    el.innerHTML = list.map(i => `
      <a href="${deviceUrl(i)}" class="res-row" style="color:inherit;text-decoration:none">
        <div class="res-ic" style="width:56px;height:56px;padding:4px">${DEVICE_SVG(i.t)}</div>
        <div>
          <div class="nm">${i.n}</div>
          <div class="mfr">${i.mfr} · ${i.mn} · ${categoryLabel(i)}</div>
        </div>
        <div><div class="k">MRI status</div><div class="v"><span class="cls-tag ${i.statusClass==='ok'?'':i.statusClass==='warn'?'warn':i.statusClass==='err'?'err':''}">${i.status}</span></div></div>
        <div><div class="k">Max SAR</div><div class="v">${META_COMMON.sar}</div></div>
        <div><div class="k">Verified</div><div class="v">${META_COMMON.verified}</div></div>
        <div style="text-align:right;color:var(--muted2);font-size:22px">›</div>
      </a>
    `).join('');
  }
  document.getElementById('res-count').textContent = ` — ${list.length} of ${IMPLANTS.length} devices`;
  document.getElementById('res-count-list').textContent = `${list.length} result${list.length === 1 ? '' : 's'}`;
}

function setView(v){
  curView = v;
  localStorage.setItem('iid-view', v);
  document.querySelectorAll('#view-toggle button').forEach(b => b.classList.toggle('on', b.dataset.view === v));
  render();
}

// Init from URL
const params = new URLSearchParams(location.search);
curFilt = params.get('f') || 'all';
const initQ = params.get('q') || '';
if (initQ) document.getElementById('libq').value = initQ;

document.querySelectorAll('.lib-filt button').forEach(b => {
  if (b.dataset.filt === curFilt){ document.querySelectorAll('.lib-filt button').forEach(x=>x.classList.remove('on')); b.classList.add('on'); }
  b.addEventListener('click', () => {
    document.querySelectorAll('.lib-filt button').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    curFilt = b.dataset.filt;
    render();
  });
});
document.querySelectorAll('.lib-mfr button').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.lib-mfr button').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    curMfr = b.dataset.mfr;
    render();
  });
});
document.getElementById('libq').addEventListener('input', render);
function doSearch(){ render(); }

// Initial view highlight + render
document.querySelectorAll('#view-toggle button').forEach(b => b.classList.toggle('on', b.dataset.view === curView));
render();
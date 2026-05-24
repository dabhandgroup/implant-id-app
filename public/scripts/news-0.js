const POSTS = [
  {cat:'Recalls', title:'Class II recall: Medtronic MiniMed 670G affected serials published', excerpt:'The FDA has issued an updated recall notice. Check your patients with this device against the affected serial ranges.', date:'12 Apr 2026', author:'Library team', img:'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&q=80'},
  {cat:'Library', title:'89 Medtronic SureScan + 75 Boston Scientific ImageReady devices now indexed', excerpt:'Every pacemaker, CRT-P, CRT-D, ICD, S-ICD, EV-ICD and ICM — with lead compatibility and safety parameters.', date:'10 Apr 2026', author:'Product team', img:'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80'},
  {cat:'Field notes', title:'"We cut our pre-MRI paperwork from 40 minutes to 90 seconds" — Axis Radiology', excerpt:'How a three-scanner clinic retired the manufacturer call-loop using Apple Wallet scan-to-profile.', date:'08 Apr 2026', author:'L. Pereira · Practice Manager', img:'https://images.unsplash.com/photo-1551076805-e1869033e561?w=800&q=80'},
  {cat:'Industry', title:'New UK RCR guidance: what it means for MRI-conditional device screening', excerpt:'The Royal College of Radiologists published updated MRI implant screening guidance. Here is the short read.', date:'05 Apr 2026', author:'Editorial', img:'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=800&q=80'},
  {cat:'Recalls', title:'St Jude Riata lead — safety data re-verification window opens', excerpt:'Manufacturer has issued refreshed safety documentation. Existing records auto-synced today.', date:'03 Apr 2026', author:'Library team', img:'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=800&q=80'},
  {cat:'Company', title:'Implant ID passes SOC 2 Type I audit', excerpt:'The full audit report is available on request. HIPAA-grade infrastructure and audit logs remain the foundation.', date:'29 Mar 2026', author:'Trust team', img:'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&q=80'},
  {cat:'Field notes', title:'What MRI techs actually want from a device lookup tool', excerpt:'Findings from 22 interviews with MRI technologists and radiologists across three continents.', date:'22 Mar 2026', author:'UX research', img:'https://images.unsplash.com/photo-1512070679279-8988d32161be?w=800&q=80'},
  {cat:'Industry', title:'Apple Wallet medical passes: the quiet revolution in patient-held records', excerpt:'Why the phone is now the best interface for a portable, signed, always-current implant record.', date:'18 Mar 2026', author:'Editorial', img:'https://images.unsplash.com/photo-1606041008023-472dfb5e530f?w=800&q=80'},
  {cat:'Library', title:'Boston Scientific ImageReady devices now live — search any model number', excerpt:'75 pacemakers, ICDs, CRT-Ds, S-ICDs, and ICMs with full MRI parameter tables and lead compatibility.', date:'14 Mar 2026', author:'Product team', img:'https://images.unsplash.com/photo-1504439904031-93ded9f93e4e?w=800&q=80'},
];

const ch = document.getElementById('news-chips');
const grid = document.getElementById('news-grid');
const q = document.getElementById('nq');
let curCat = 'all';

function render(){
  const qv = q.value.trim().toLowerCase();
  const list = POSTS.filter(p => (curCat === 'all' || p.cat === curCat) && (!qv || (p.title + ' ' + p.excerpt + ' ' + p.cat).toLowerCase().includes(qv)));
  grid.innerHTML = list.map(p => `
    <a href="#" class="news-card">
      <div class="img" style="background-image:url('${p.img}')"></div>
      <div class="body">
        <span class="cat">${p.cat}</span>
        <h3>${p.title}</h3>
        <p>${p.excerpt}</p>
        <div class="meta"><span>${p.author}</span><span>${p.date}</span></div>
      </div>
    </a>
  `).join('') || '<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--muted)">No articles match.</div>';
}
ch.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  ch.querySelectorAll('button').forEach(x => x.classList.remove('on'));
  b.classList.add('on');
  curCat = b.dataset.cat;
  render();
});
q.addEventListener('input', render);
render();
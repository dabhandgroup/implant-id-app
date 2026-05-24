function toggleSb(){document.getElementById('app').classList.toggle('collapsed');try{localStorage.setItem('iid-sb',document.getElementById('app').classList.contains('collapsed')?'1':'0')}catch(e){}}
try{if(localStorage.getItem('iid-sb')!=='0')document.getElementById('app').classList.add('collapsed')}catch(e){}
function openCmdk(){document.getElementById('cmdk').classList.add('open');setTimeout(function(){var i=document.querySelector('#cmdk input');if(i)i.focus()},30)}
function closeCmdk(){document.getElementById('cmdk').classList.remove('open')}
document.addEventListener('keydown',function(e){
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openCmdk()}
  if(e.key==='Escape')closeCmdk()
});
document.addEventListener('click',function(e){
  var d=document.getElementById('dd-export');
  if(d && !d.contains(e.target)) d.classList.remove('open');
  var ls=document.getElementById('live-sugg');
  if(ls && !e.target.closest('.hero-search')) ls.classList.remove('on');
});

function doAppSearch(){var v=document.getElementById('live-q').value.trim();window.location.href='/library'+(v?'?q='+encodeURIComponent(v):'')}
document.addEventListener('keydown',function(e){if(e.key==='Enter'&&document.activeElement&&document.activeElement.id==='live-q')doAppSearch()});
// LIVE SEARCH SUGGESTIONS
(function(){
  var DATA = [
    {t:'implant', n:'Medtronic Azure XT DR', m:'W3DR01 · Pacemaker', href:'/clinics/patient-view'},
    {t:'implant', n:'Abbott Tendril STS', m:'2088TC · Pacing lead', href:'#'},
    {t:'implant', n:'Boston Scientific Accolade MRI', m:'L331 · Pacemaker', href:'#'},
    {t:'implant', n:'Medtronic Evera MRI XT DR', m:'DDBB3D4 · Defibrillator', href:'#'},
    {t:'implant', n:'Cochlear Nucleus 7 CP1000', m:'CP1000 · Cochlear', href:'#'},
    {t:'implant', n:'Stryker Triathlon Knee', m:'5540-E · Orthopaedic', href:'#'},
    {t:'implant', n:'Abbott Proclaim XR', m:'3660 · Neurostimulator', href:'#'},
    {t:'patient', n:'Trevor Hughes', m:'TH-4821-IID · Medtronic Azure XT DR', href:'/clinics/patient-view'},
    {t:'patient', n:'Raymond Tan', m:'RT-1829-IID · Abbott Tendril', href:'/clinics/patient-view'},
    {t:'patient', n:'Siobhan Walsh', m:'SW-0412-IID · Boston Scientific Accolade', href:'/clinics/patient-view'},
    {t:'patient', n:'Amir Khoury', m:'AK-5501-IID · Stryker Neptune', href:'/clinics/patient-view'},
  ];
  var icons = {
    implant: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 12h16M12 4v16"/></svg>',
    patient: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg>'
  };
  function hl(txt,q){if(!q)return txt;var re=new RegExp('('+q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','i');return txt.replace(re,'<em>$1</em>')}
  var q=document.getElementById('live-q'), ls=document.getElementById('live-sugg');
  if(!q||!ls) return;
  function render(){
    var v=q.value.trim();
    if(!v){ls.classList.remove('on');ls.innerHTML='';return}
    var matches = DATA.filter(d => (d.n+' '+d.m).toLowerCase().includes(v.toLowerCase())).slice(0,6);
    if(!matches.length){ls.innerHTML='<div style="padding:16px;color:var(--muted2);font-size:13px">No matches. Try another term.</div>';ls.classList.add('on');return}
    var byT={};
    matches.forEach(m=>{byT[m.t]=byT[m.t]||[];byT[m.t].push(m)});
    var h='';
    if(byT.implant){h+='<div class="sec">Implants</div>'+byT.implant.map(m=>`<a href="${m.href}">${icons.implant}<div><div>${hl(m.n,v)}</div><div style="font-size:12px;color:var(--muted2)">${hl(m.m,v)}</div></div></a>`).join('')}
    if(byT.patient){h+='<div class="sec">Patients</div>'+byT.patient.map(m=>`<a href="${m.href}">${icons.patient}<div><div>${hl(m.n,v)}</div><div style="font-size:12px;color:var(--muted2)">${hl(m.m,v)}</div></div></a>`).join('')}
    ls.innerHTML=h; ls.classList.add('on');
  }
  q.addEventListener('input',render);
  q.addEventListener('focus',function(){if(q.value)render()});
})();
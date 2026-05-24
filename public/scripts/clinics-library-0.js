function categoryLabel(i){var c=i.chamber?i.chamber+'-chamber ':'';var s=i.sub?' '+i.sub:'';return(c+(TYPE_LABEL[i.t]||'')+s).trim()}
function deviceUrl(i){return'/device/'+encodeURIComponent(i.mn)}
var curFilt='all',curMfr='all',curView=(localStorage.getItem('iid-view')||'grid');
function render(){
  var q=(document.getElementById('libq').value||'').toLowerCase().trim();
  var list=IMPLANTS.filter(function(i){
    if(curFilt!=='all'&&i.t!==curFilt)return false;
    if(curMfr!=='all'&&i.mfr!==curMfr)return false;
    if(!q)return true;
    return(i.n+' '+i.mn+' '+i.mfr+' '+(i.chamber||'')+' '+categoryLabel(i)).toLowerCase().indexOf(q)>-1;
  });
  var el=document.getElementById('res-list');
  if(!list.length){el.className='';el.innerHTML='<div style="text-align:center;padding:48px;color:var(--muted);background:var(--bg2);border:1px solid var(--border);border-radius:14px">No matches.</div>';
  }else if(curView==='grid'){
    el.className='res-grid';
    el.innerHTML=list.map(function(i){
      var sc=(i.statusClass==='warn'||i.statusClass==='err')?i.statusClass:'';
      var ss=i.status.replace('MR Conditional ','').replace(' ','\u00A0');
      return'<a class="res-card" href="'+deviceUrl(i)+'">'+'<div class="res-card-img">'+DEVICE_SVG(i.t)+'<span class="mfr-tag">'+(i.mfr==='Medtronic'?'Medtronic':'Boston Sci.')+'</span>'+'<span class="cls-tag '+sc+'">'+ss+'</span></div>'+'<div class="res-card-body"><span class="cat">'+categoryLabel(i)+'</span><span class="nm">'+i.n+'</span><span class="mn">Model '+i.mn+'</span><span class="st '+sc+'">'+i.status+'</span></div></a>';
    }).join('');
  }else{
    el.className='';
    el.innerHTML=list.map(function(i){
      var sc=(i.statusClass==='ok'?'':i.statusClass);
      return'<a href="'+deviceUrl(i)+'" class="res-row"><div class="res-ic" style="width:48px;height:48px;padding:4px">'+DEVICE_SVG(i.t)+'</div><div><div class="nm">'+i.n+'</div><div class="mfr">'+i.mfr+' · '+i.mn+' · '+categoryLabel(i)+'</div></div><div><div class="k">MRI status</div><div class="v"><span class="cls-tag '+sc+'">'+i.status+'</span></div></div><div><div class="k">Max SAR</div><div class="v">'+META_COMMON.sar+'</div></div><div><div class="k">Verified</div><div class="v">'+META_COMMON.verified+'</div></div><div style="text-align:right;color:var(--muted2);font-size:20px">›</div></a>';
    }).join('');
  }
  document.getElementById('res-count').textContent=' — '+list.length+' of '+IMPLANTS.length+' devices';
  document.getElementById('res-count-list').textContent=list.length+' result'+(list.length===1?'':'s');
}
function setView(v){curView=v;localStorage.setItem('iid-view',v);document.querySelectorAll('#view-toggle button').forEach(function(b){b.classList.toggle('on',b.dataset.view===v)});render()}
var params=new URLSearchParams(location.search);curFilt=params.get('f')||'all';
var initQ=params.get('q')||'';if(initQ)document.getElementById('libq').value=initQ;
document.querySelectorAll('.lib-filt button').forEach(function(b){
  if(b.dataset.filt===curFilt){document.querySelectorAll('.lib-filt button').forEach(function(x){x.classList.remove('on')});b.classList.add('on')}
  b.addEventListener('click',function(){document.querySelectorAll('.lib-filt button').forEach(function(x){x.classList.remove('on')});b.classList.add('on');curFilt=b.dataset.filt;render()});
});
document.querySelectorAll('.lib-mfr button').forEach(function(b){
  b.addEventListener('click',function(){document.querySelectorAll('.lib-mfr button').forEach(function(x){x.classList.remove('on')});b.classList.add('on');curMfr=b.dataset.mfr;render()});
});
document.getElementById('libq').addEventListener('input',render);
function doSearch(){render()}
document.querySelectorAll('#view-toggle button').forEach(function(b){b.classList.toggle('on',b.dataset.view===curView)});
render();
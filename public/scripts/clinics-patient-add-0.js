function pickTab(el,id){
  document.querySelectorAll('.tabs button').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.pane').forEach(p=>p.classList.remove('active'));
  document.getElementById('pane-'+id).classList.add('active');
}
function openOcr(){document.getElementById('ocr').classList.add('open')}
function closeOcr(){document.getElementById('ocr').classList.remove('open');retryOcr()}
function simulateCapture(){document.getElementById('ocr-stage1').style.display='none';document.getElementById('ocr-stage2').classList.add('on')}
function retryOcr(){document.getElementById('ocr-stage1').style.display='';document.getElementById('ocr-stage2').classList.remove('on')}
function pickCdd(id,v){var d=document.getElementById(id);d.querySelector('.cdd-btn').textContent=v;d.querySelector('.cdd-btn').classList.remove('ph');d.classList.remove('open')}
var _sY=0,_wasCol=false;
function mobMenuOpen(){var app=document.getElementById('app');_wasCol=app.classList.contains('collapsed');app.classList.remove('collapsed');var s=document.querySelector('.sidebar'),bk=document.getElementById('sb-back');s.classList.add('open');bk.classList.add('open');_sY=window.scrollY;document.body.style.cssText='position:fixed;top:-'+_sY+'px;width:100%'}
function mobMenuClose(){var s=document.querySelector('.sidebar'),bk=document.getElementById('sb-back');s.classList.remove('open');bk.classList.remove('open');document.body.style.cssText='';window.scrollTo(0,_sY);if(_wasCol)document.getElementById('app').classList.add('collapsed')}
function toggleSb(){document.getElementById('app').classList.toggle('collapsed');try{localStorage.setItem('iid-sb-cl',document.getElementById('app').classList.contains('collapsed')?'1':'0')}catch(e){}}
try{if(localStorage.getItem('iid-sb-cl')==='1')document.getElementById('app').classList.add('collapsed')}catch(e){}
document.addEventListener('click',function(e){
  document.querySelectorAll('.cdd').forEach(function(d){if(!d.contains(e.target))d.classList.remove('open')});
  document.querySelectorAll('.mob-hdr-menu').forEach(function(d){
    if(!d.closest('.mob-hdr-profile').contains(e.target))d.classList.remove('open');
  });
});
document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeOcr();mobMenuClose()}});
var _sY=0,_wasCol=false;
function mobMenuOpen(){var app=document.getElementById('app');_wasCol=app.classList.contains('collapsed');app.classList.remove('collapsed');var s=document.querySelector('.sidebar'),bk=document.getElementById('sb-back');s.classList.add('open');bk.classList.add('open');_sY=window.scrollY;document.body.style.cssText='position:fixed;top:-'+_sY+'px;width:100%'}
function mobMenuClose(){var s=document.querySelector('.sidebar'),bk=document.getElementById('sb-back');s.classList.remove('open');bk.classList.remove('open');document.body.style.cssText='';window.scrollTo(0,_sY);if(_wasCol)document.getElementById('app').classList.add('collapsed')}
function toggleSb(){
  document.getElementById('app').classList.toggle('collapsed');
  try{localStorage.setItem('iid-sb-mfr', document.getElementById('app').classList.contains('collapsed')?'1':'0')}catch(e){}
}
try{ if (localStorage.getItem('iid-sb-mfr')!=='0') document.getElementById('app').classList.add('collapsed'); }catch(e){}

var VALID_TABS = ['devices','add','bulk','docs','audit','account'];
function showTab(id, btn){
  if (!document.getElementById('tab-' + id)) return;
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + id).classList.add('active');
  document.querySelectorAll('.sb-link').forEach(l => l.classList.remove('active'));
  if (btn) btn.classList.add('active');
  else {
    var link = document.querySelector('.sb-link[data-tab="'+id+'"]');
    if (link) link.classList.add('active');
  }
  // Update URL hash without triggering a scroll
  try { history.replaceState(null, '', '#' + id); } catch(e) {}
  window.scrollTo({top:0,behavior:'instant'});
  if (window.innerWidth < 900) mobMenuClose();
}
// Restore tab from URL hash on load
(function(){
  var hash = (location.hash || '').slice(1);
  if (hash && VALID_TABS.indexOf(hash) > -1) showTab(hash);
})();
document.addEventListener('click', function(e){
  var m = document.getElementById('profile-menu');
  if (m && !e.target.closest('.sb-bot') && !e.target.closest('.profile-menu')) m.classList.remove('open');
});
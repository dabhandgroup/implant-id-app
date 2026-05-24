var _sY=0,_wasCol=false;
function mobMenuOpen(){var app=document.getElementById('app');_wasCol=app.classList.contains('collapsed');app.classList.remove('collapsed');var s=document.querySelector('.sidebar'),bk=document.getElementById('sb-back');s.classList.add('open');bk.classList.add('open');_sY=window.scrollY;document.body.style.cssText='position:fixed;top:-'+_sY+'px;width:100%'}
function mobMenuClose(){var s=document.querySelector('.sidebar'),bk=document.getElementById('sb-back');s.classList.remove('open');bk.classList.remove('open');document.body.style.cssText='';window.scrollTo(0,_sY);if(_wasCol)document.getElementById('app').classList.add('collapsed')}
function openLogout(){document.getElementById('logout-back').classList.add('open')}
function closeLogout(){document.getElementById('logout-back').classList.remove('open')}
document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeLogout();mobMenuClose()}});
document.addEventListener('click',function(e){
  var m=document.getElementById('profile-menu');if(m&&!e.target.closest('.sb-bot')&&!e.target.closest('.profile-menu'))m.classList.remove('open');
  document.querySelectorAll('.mob-hdr-menu').forEach(function(d){if(!d.closest('.mob-hdr-profile').contains(e.target))d.classList.remove('open')});
});
function toggleSb(){document.getElementById('app').classList.toggle('collapsed');try{localStorage.setItem('iid-sb',document.getElementById('app').classList.contains('collapsed')?'1':'0')}catch(e){}}
try{if(localStorage.getItem('iid-sb')!=='0')document.getElementById('app').classList.add('collapsed')}catch(e){}
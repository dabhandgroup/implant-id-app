var _sY=0,_wasCol=false;
function mobMenuOpen(){var app=document.getElementById('app');_wasCol=app.classList.contains('collapsed');app.classList.remove('collapsed');var s=document.querySelector('.sidebar'),bk=document.getElementById('sb-back');s.classList.add('open');bk.classList.add('open');_sY=window.scrollY;document.body.style.cssText='position:fixed;top:-'+_sY+'px;width:100%'}
function mobMenuClose(){var s=document.querySelector('.sidebar'),bk=document.getElementById('sb-back');s.classList.remove('open');bk.classList.remove('open');document.body.style.cssText='';window.scrollTo(0,_sY);if(_wasCol)document.getElementById('app').classList.add('collapsed')}
function openNotif(){document.getElementById('notif-drawer').classList.add('open');document.getElementById('notif-back').classList.add('open')}
function closeNotif(){document.getElementById('notif-drawer').classList.remove('open');document.getElementById('notif-back').classList.remove('open')}
function openLogout(){document.getElementById('logout-back').classList.add('open')}
function closeLogout(){document.getElementById('logout-back').classList.remove('open')}
document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeNotif();closeLogout();mobMenuClose();var m=document.getElementById('profile-menu');if(m)m.classList.remove('open')}});
document.addEventListener('click',function(e){
  document.querySelectorAll('.mob-hdr-menu').forEach(function(d){if(!d.closest('.mob-hdr-profile').contains(e.target))d.classList.remove('open')});
  var m=document.getElementById('profile-menu');if(m&&!e.target.closest('.sb-bot')&&!e.target.closest('.profile-menu'))m.classList.remove('open');
});
// Load QR
(function(){
  var url=(location.origin||'https://implantid.io')+'/pass/TH-4821-IID';
  var img=document.getElementById('sh-qr-img');
  if(img)img.src='https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data='+encodeURIComponent(url);
})();
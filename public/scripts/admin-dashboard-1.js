function syncMobTab(btn){
  document.querySelectorAll('.mob-nav-tab').forEach(function(b){b.classList.remove('active')});
  btn.classList.add('active');
}
document.addEventListener('click',function(e){
  document.querySelectorAll('.mob-hdr-menu').forEach(function(m){
    if(!m.closest('.mob-hdr-profile').contains(e.target))m.classList.remove('open');
  });
});
function openNotif(){
  var d=document.getElementById('notif-drawer'),b=document.getElementById('notif-back');
  if(d)d.classList.add('open');if(b)b.classList.add('open');
  document.body.style.overflow='hidden';
}
function closeNotif(){
  var d=document.getElementById('notif-drawer'),b=document.getElementById('notif-back');
  if(d)d.classList.remove('open');if(b)b.classList.remove('open');
  document.body.style.overflow='';
}
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeNotif();});
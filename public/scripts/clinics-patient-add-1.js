function openNotif(){document.getElementById('notif-drawer').classList.add('open');document.getElementById('notif-back').classList.add('open')}
function closeNotif(){document.getElementById('notif-drawer').classList.remove('open');document.getElementById('notif-back').classList.remove('open')}
function openLogout(){document.getElementById('logout-back').classList.add('open')}
function closeLogout(){document.getElementById('logout-back').classList.remove('open')}
document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeNotif();closeLogout()}});
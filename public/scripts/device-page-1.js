function openSignIn(){document.getElementById('si-back').classList.add('open');document.body.style.overflow='hidden'}
function closeSignIn(){document.getElementById('si-back').classList.remove('open');document.body.style.overflow=''}
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeSignIn()});
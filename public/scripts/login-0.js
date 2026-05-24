function setTab(btn, role) {
  document.querySelectorAll('.auth-tabs button').forEach(function(b){b.classList.remove('active')});
  btn.classList.add('active');
  document.querySelectorAll('.tab-view').forEach(function(v){v.classList.remove('active')});
  var el = document.getElementById('tab-'+role);
  if(el) el.classList.add('active');
}
function showPhase(prefix, n) {
  var parent = document.getElementById('tab-'+(prefix==='pt'?'patient':'clinic'));
  if(!parent) return;
  parent.querySelectorAll('.login-phase').forEach(function(p){p.classList.remove('on')});
  var el = document.getElementById(prefix+'-phase-'+n);
  if(el) el.classList.add('on');
}
function togglePw(id, btn) {
  var i=document.getElementById(id);
  var eo=btn.querySelector('.eye-o'), ec=btn.querySelector('.eye-c');
  if(i.type==='password'){i.type='text';eo.style.display='none';ec.style.display='block'}
  else{i.type='password';eo.style.display='block';ec.style.display='none'}
}
function togglePhoneMenu(codeBtn) {
  var dd = codeBtn.closest('.phone-row').querySelector('.phone-dd');
  if(dd) dd.classList.toggle('open');
}
function pickCode(btn, flag, dial, placeholder) {
  var row = btn.closest('.phone-row');
  var codeBtn = row.querySelector('.phone-code');
  codeBtn.querySelector('.flag-circle').textContent = flag;
  codeBtn.querySelector('.dial').textContent = dial;
  var input = row.querySelector('input[type="tel"]');
  if(input) input.placeholder = placeholder;
  row.querySelector('.phone-dd').classList.remove('open');
}
function filterCountries(input) {
  var q = input.value.toLowerCase();
  var list = input.closest('.phone-dd').querySelector('.phone-dd-list');
  list.querySelectorAll('button').forEach(function(b){
    b.style.display = b.textContent.toLowerCase().indexOf(q) > -1 ? 'flex' : 'none';
  });
}
function codeAdvance(el) {
  if(el.value && el.nextElementSibling && el.nextElementSibling.classList.contains('code-input')) {
    el.nextElementSibling.focus();
  }
}
document.addEventListener('click', function(e){
  document.querySelectorAll('.phone-dd.open').forEach(function(dd){
    if(!dd.closest('.phone-row').contains(e.target)) dd.classList.remove('open');
  });
});

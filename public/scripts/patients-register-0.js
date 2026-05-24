function goStep(n){
  document.querySelectorAll('.step-pane').forEach(function(p){p.classList.remove('on')});
  var el=document.getElementById('pane-'+n);
  if(el) el.classList.add('on');
  document.querySelectorAll('.stepper .dot').forEach(function(d,i){
    d.classList.toggle('on',i<n);
    d.classList.toggle('done',i<n-1);
  });
  document.querySelector('.auth-main')?.scrollTo(0,0);
}

function togglePhoneMenu(codeBtn) {
  var dd = codeBtn.closest('.phone-row').querySelector('.phone-dd');
  if(dd) dd.classList.toggle('open');
}
function pickRegCode(btn, flag, dial, placeholder) {
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

function selectCountry(btn, flag, name) {
  var sel = btn.closest('.custom-select');
  var val = sel.querySelector('.custom-select-val');
  val.innerHTML = '<span class="flag-circle" style="width:18px;height:18px;font-size:12px">'+flag+'</span> '+name;
  sel.classList.remove('open');
}
function filterSelect(input) {
  var q = input.value.toLowerCase();
  var list = input.closest('.custom-select-dd').querySelector('.custom-select-list');
  list.querySelectorAll('button').forEach(function(b){
    b.style.display = b.textContent.toLowerCase().indexOf(q) > -1 ? 'flex' : 'none';
  });
}

function codeAdvance(el) {
  if(el.value && el.nextElementSibling && el.nextElementSibling.classList.contains('code-input')) {
    el.nextElementSibling.focus();
  }
}

var implantCount = 1;
function addImplantBlock() {
  implantCount++;
  var container = document.getElementById('implant-blocks');
  var block = document.createElement('div');
  block.className = 'implant-block';
  block.innerHTML = '<div class="implant-block-hd" style="font-family:var(--ff);font-size:13px;font-weight:600;color:var(--accent);margin-bottom:10px;display:flex;align-items:center;justify-content:space-between"><span style="display:flex;align-items:center;gap:6px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/></svg> Implant '+implantCount+'</span><button type="button" style="background:none;border:0;color:var(--muted);cursor:pointer;font-size:12px;font-family:var(--ff)" onclick="this.closest(\'.implant-block\').remove()">Remove</button></div>'
    + '<div class="field"><label>Hospital / clinic where implanted</label><input class="input" placeholder="e.g. Royal Melbourne Hospital"></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="field"><label>Surgeon name (if known)</label><input class="input" placeholder="e.g. Dr Sarah Chen"></div><div class="field"><label>Date of surgery</label><input class="input" type="date"></div></div>'
    + '<div class="field" style="margin-top:4px"><label>Additional information</label><textarea class="input" rows="2" placeholder="Anything else — allergies, previous devices, lead changes…"></textarea></div>';
  container.appendChild(block);
}

document.addEventListener('click', function(e){
  document.querySelectorAll('.phone-dd.open').forEach(function(dd){
    if(!dd.closest('.phone-row').contains(e.target)) dd.classList.remove('open');
  });
  document.querySelectorAll('.custom-select.open').forEach(function(sel){
    if(!sel.contains(e.target)) sel.classList.remove('open');
  });
});

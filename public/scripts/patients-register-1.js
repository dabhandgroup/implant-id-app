// Device search for patient registration
(function(){
  var input = document.getElementById('dev-q');
  var results = document.getElementById('dev-results');
  var selected = document.getElementById('dev-selected');
  if (!input || !results) return;

  function render(){
    var q = (input.value||'').trim().toLowerCase();
    if (q.length < 2 || typeof IMPLANTS === 'undefined'){
      results.classList.remove('on');
      return;
    }
    var matches = IMPLANTS.filter(function(i){
      return (i.n||'').toLowerCase().indexOf(q) > -1
          || (i.mn||'').toLowerCase().indexOf(q) > -1
          || (i.mfr||'').toLowerCase().indexOf(q) > -1;
    }).slice(0, 8);

    if (matches.length === 0){
      results.innerHTML = '<div class="empty">No devices match "'+q+'" — try another search or enter manually below</div>';
      results.classList.add('on');
      return;
    }

    var html = '<div class="sec">'+matches.length+' match'+(matches.length===1?'':'es')+'</div>';
    matches.forEach(function(m){
      html += '<a href="#" onclick="event.preventDefault();selectDevice(\''+m.n.replace(/'/g,"\\'")+'\',\''+m.mn+' · '+m.mfr+(m.type?' · '+m.type:'')+'\')"><div><div class="nm">'+m.n+'</div><div class="mn">'+m.mfr+' · '+m.mn+(m.type?' · '+m.type:'')+'</div></div></a>';
    });
    results.innerHTML = html;
    results.classList.add('on');
  }

  input.addEventListener('input', render);
  input.addEventListener('focus', render);
  document.addEventListener('click', function(e){
    if (!results.contains(e.target) && e.target !== input) results.classList.remove('on');
  });
})();

function selectDevice(name, info){
  document.getElementById('sel-name').textContent = name;
  document.getElementById('sel-mn').textContent = info;
  document.getElementById('dev-selected').style.display = 'block';
  document.getElementById('dev-results').classList.remove('on');
  document.getElementById('dev-q').value = name;
}
function clearDevice(){
  document.getElementById('dev-selected').style.display = 'none';
  document.getElementById('dev-q').value = '';
}

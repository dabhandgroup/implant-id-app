// Home hero ajax search
(function(){
  var input = document.getElementById('home-q');
  var sugg = document.getElementById('home-sugg');
  if (!input || !sugg) return;

  function highlight(text, q){
    if (!q) return text;
    var re = new RegExp('('+q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','ig');
    return text.replace(re,'<em>$1</em>');
  }
  function deviceUrl(i){ return '/device?mn=' + encodeURIComponent(i.mn); }

  function render(){
    var q = (input.value||'').trim().toLowerCase();
    if (q.length < 1 || typeof IMPLANTS === 'undefined'){
      sugg.classList.remove('on');
      return;
    }
    var matches = IMPLANTS.filter(function(i){
      return (i.n||'').toLowerCase().indexOf(q) > -1
          || (i.mn||'').toLowerCase().indexOf(q) > -1
          || (i.mfr||'').toLowerCase().indexOf(q) > -1;
    }).slice(0, 6);

    if (matches.length === 0){
      sugg.innerHTML = '<div class="empty">No devices match "'+q+'"</div>';
      sugg.classList.add('on');
      return;
    }

    var ic = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/></svg>';
    var html = '<div class="sec">'+matches.length+' match'+(matches.length===1?'':'es')+'</div>';
    matches.forEach(function(m){
      html += '<a href="'+deviceUrl(m)+'">'
        + '<div class="ic">'+ic+'</div>'
        + '<div><div class="nm">'+highlight(m.n,q)+'</div>'
        + '<div class="mf">'+m.mfr+' · '+highlight(m.mn,q)+'</div></div>'
        + '</a>';
    });
    html += '<a href="/library?q='+encodeURIComponent(q)+'" class="more">See all results for "'+q+'" →</a>';
    sugg.innerHTML = html;
    sugg.classList.add('on');
  }

  input.addEventListener('input', render);
  input.addEventListener('focus', render);
  input.addEventListener('keydown', function(e){
    if (e.key === 'Enter') window.location.href='/library?q='+encodeURIComponent(input.value);
    if (e.key === 'Escape') sugg.classList.remove('on');
  });
  document.addEventListener('click', function(e){
    if (!sugg.contains(e.target) && e.target !== input) sugg.classList.remove('on');
  });
})();
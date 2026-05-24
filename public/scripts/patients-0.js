document.addEventListener('click',function(e){
  var l=document.getElementById('lang');
  if(l && !l.contains(e.target)) l.classList.remove('open');
});
(function(){
  var b=document.body;
  window.addEventListener('scroll',function(){
    if(window.scrollY>60) b.classList.add('scrolled'); else b.classList.remove('scrolled');
  },{passive:true});
})();
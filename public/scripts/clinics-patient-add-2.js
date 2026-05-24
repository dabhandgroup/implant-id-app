document.addEventListener("click",function(e){
  var m=document.getElementById("profile-menu");
  if(m && !e.target.closest(".sb-bot") && !e.target.closest(".profile-menu"))m.classList.remove("open");
  document.querySelectorAll('.mob-hdr-menu').forEach(function(d){
    if(!d.closest('.mob-hdr-profile').contains(e.target))d.classList.remove('open');
  });
});
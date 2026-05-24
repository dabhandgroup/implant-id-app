var _sY=0,_wasCol=false;
function mobMenuOpen(){var app=document.getElementById('app');_wasCol=app.classList.contains('collapsed');app.classList.remove('collapsed');var s=document.querySelector('.sidebar'),bk=document.getElementById('sb-back');s.classList.add('open');bk.classList.add('open');_sY=window.scrollY;document.body.style.cssText='position:fixed;top:-'+_sY+'px;width:100%'}
function mobMenuClose(){var s=document.querySelector('.sidebar'),bk=document.getElementById('sb-back');s.classList.remove('open');bk.classList.remove('open');document.body.style.cssText='';window.scrollTo(0,_sY);if(_wasCol)document.getElementById('app').classList.add('collapsed')}
function openNotif(){document.getElementById('notif-drawer').classList.add('open');document.getElementById('notif-back').classList.add('open')}
function closeNotif(){document.getElementById('notif-drawer').classList.remove('open');document.getElementById('notif-back').classList.remove('open')}
function openLogout(){document.getElementById('logout-back').classList.add('open')}
function closeLogout(){document.getElementById('logout-back').classList.remove('open')}
document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeNotif();closeLogout();closeAccessModal();mobMenuClose()}});

/* ── Access-request approve / decline flow ─────────────────────────────── */
var _arCard=null,_arType=null;

function openAccessModal(type,btn){
  var card=btn.closest('.pending-card');
  var nm=card.querySelector('.impl-nm').textContent.trim();
  var ic=card.querySelector('.impl-ic');
  var initials=ic.textContent.trim();
  var avBg=ic.style.background||'color-mix(in srgb,var(--accent) 12%,transparent)';
  var avCol=ic.style.color||'var(--accent)';
  _arCard=card; _arType=type;

  var isApprove=(type==='approve');
  var typeLabel=isApprove?'Approving access':'Declining request';
  var typeClass=isApprove?'am-type-approve':'am-type-decline';
  var confirmClass=isApprove?'am-confirm-approve':'am-confirm-decline';
  var confirmLabel=isApprove?'Confirm &amp; notify patient':'Decline &amp; notify patient';

  var bodyHtml=isApprove
    ? '<div class="am-detail">'
      + '<div class="am-detail-label">What they\'ll be able to see</div>'
      + '<ul>'
      + '<li>Full MRI safety profile &amp; conditions</li>'
      + '<li>Implant model, serial &amp; specifications</li>'
      + '<li>Manufacturer safety documents</li>'
      + '<li>Historical scan notes from your clinic</li>'
      + '<li>Emergency contact information</li>'
      + '</ul></div>'
    : '<label class="am-reason-label" for="am-reason">Reason for declining</label>'
      + '<select class="am-select" id="am-reason">'
      + '<option value="">Select a reason (optional)</option>'
      + '<option value="not-patient">Not a current patient at this clinic</option>'
      + '<option value="already-access">Patient already has access</option>'
      + '<option value="wrong-clinic">Request sent to wrong clinic</option>'
      + '<option value="security">Security or verification concern</option>'
      + '<option value="other">Other</option>'
      + '</select>'
      + '<p class="am-warn">The patient will be notified that their request was reviewed. No reason is shared with them unless you choose to.</p>';

  document.getElementById('access-modal').innerHTML=
    '<div class="am-head">'
    + '<div class="am-row">'
    + '<div class="am-av" style="background:'+avBg+';color:'+avCol+'">'+initials+'</div>'
    + '<div><div class="am-title">'+nm+'</div>'
    + '<div class="am-sub">Requesting full record access</div></div></div>'
    + '<span class="am-type '+typeClass+'">'+typeLabel+'</span>'
    + '</div>'
    + '<div class="am-body">'+bodyHtml+'</div>'
    + '<div class="am-actions">'
    + '<button class="am-btn am-cancel" onclick="closeAccessModal()">Cancel</button>'
    + '<button class="am-btn '+confirmClass+'" onclick="confirmAccess()">'+confirmLabel+'</button>'
    + '</div>';

  document.getElementById('access-back').classList.add('open');
}

function closeAccessModal(){
  var b=document.getElementById('access-back');
  if(b) b.classList.remove('open');
  _arCard=null; _arType=null;
}

function confirmAccess(){
  var card=_arCard, type=_arType;
  closeAccessModal();
  if(!card) return;

  var approveBtn=card.querySelector('.pc-approve');
  var declineBtn=card.querySelector('.pc-decline');

  if(type==='approve'){
    approveBtn.innerHTML='✓ Approved';
    approveBtn.style.cssText='background:var(--ok);color:#fff;opacity:.65;cursor:default;pointer-events:none;border-radius:7px;padding:5px 10px;border:0;font-family:var(--ff);font-size:12px;font-weight:500';
    if(declineBtn) declineBtn.style.display='none';
  } else {
    declineBtn.textContent='Declined';
    declineBtn.style.cssText='background:transparent;color:var(--muted2);border:1px solid var(--border);opacity:.65;cursor:default;pointer-events:none;border-radius:7px;padding:5px 10px;font-family:var(--ff);font-size:12px;font-weight:500';
    if(approveBtn) approveBtn.style.display='none';
  }

  // Animate card out after a short pause so user sees the state change
  setTimeout(function(){
    var h=card.offsetHeight;
    card.style.maxHeight=h+'px';
    card.style.overflow='hidden';
    card.style.opacity='0.4';
    card.style.transition='max-height .38s ease-out, opacity .38s ease-out, padding .38s ease-out, margin .38s ease-out';
    setTimeout(function(){
      card.style.maxHeight='0';
      card.style.paddingTop='0';
      card.style.paddingBottom='0';
      card.style.marginTop='0';
      card.style.marginBottom='0';
      card.style.borderBottom='none';
      setTimeout(function(){
        if(card.parentNode) card.parentNode.removeChild(card);
        _updatePendingCount();
      },400);
    },30);
  },700);
}

function _updatePendingCount(){
  var remaining=document.querySelectorAll('.pending-card').length;

  // Badge in the sidebar panel header
  var badge=document.querySelector('.qa-panel .pill-warn');
  if(badge){ if(remaining>0) badge.textContent=remaining; else badge.style.display='none'; }

  // Stat card (Pending)
  var statVal=document.querySelector('.scl-v[style*="warn"]');
  if(statVal) statVal.textContent=remaining;

  // Empty state inside the pending panel
  if(remaining===0){
    var list=document.querySelector('.pending-cards');
    if(list) list.innerHTML='<div style="padding:20px 18px;font-size:13px;color:var(--muted)">All caught up — no pending requests.</div>';
  }
}

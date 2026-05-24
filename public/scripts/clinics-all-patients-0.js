// Clinics — All patients page
(function () {

  // ── Search & filter ────────────────────────────────────────────────────────
  var searchInput = document.getElementById('ap-search');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      var q = this.value.toLowerCase();
      document.querySelectorAll('.ap-row').forEach(function (row) {
        var text = row.textContent.toLowerCase();
        row.style.display = text.includes(q) ? '' : 'none';
      });
    });
  }

  document.querySelectorAll('.ap-filter-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.ap-filter-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var filter = btn.dataset.filter || 'all';
      document.querySelectorAll('.ap-row').forEach(function (row) {
        if (filter === 'all') { row.style.display = ''; return; }
        var badge = row.querySelector('.access-badge');
        var match = badge && badge.dataset.status === filter;
        row.style.display = match ? '' : 'none';
      });
    });
  });

  // ── Request access flow ────────────────────────────────────────────────────
  window.apRequestAccess = function (btn) {
    var row = btn.closest('.ap-row');
    var confirm = row ? row.querySelector('.ap-confirm-inline') : null;
    if (confirm) {
      confirm.style.display = confirm.style.display === 'none' ? '' : 'none';
    }
  };
  window.apSendRequest = function (btn) {
    var row = btn.closest('.ap-row');
    if (!row) return;
    var badge = row.querySelector('.access-badge');
    if (badge) { badge.textContent = 'Request sent'; badge.className = 'access-badge warn'; badge.dataset.status = 'pending'; }
    var confirm = row.querySelector('.ap-confirm-inline');
    if (confirm) confirm.style.display = 'none';
    var actCell = row.querySelector('.ap-actions');
    if (actCell) actCell.innerHTML = '<span style="font-size:13px;color:var(--muted)">Waiting for patient…</span>';
  };
  window.apCancelRequest = function (btn) {
    var confirm = btn.closest('.ap-confirm-inline');
    if (confirm) confirm.style.display = 'none';
  };

  // ── Approve / Decline ──────────────────────────────────────────────────────
  window.apApprove = function (btn) {
    var row = btn.closest('.ap-row');
    if (!row) return;
    var badge = row.querySelector('.access-badge');
    if (badge) { badge.textContent = 'Access granted'; badge.className = 'access-badge ok'; badge.dataset.status = 'granted'; }
    var actCell = row.querySelector('.ap-actions');
    if (actCell) actCell.innerHTML = '<button class="ap-btn ap-btn-ok">View record</button>';
  };
  window.apDecline = function (btn) {
    var row = btn.closest('.ap-row');
    if (!row) return;
    var badge = row.querySelector('.access-badge');
    if (badge) { badge.textContent = 'No access'; badge.className = 'access-badge muted'; badge.dataset.status = 'none'; }
    var actCell = row.querySelector('.ap-actions');
    if (actCell) actCell.innerHTML = '<button class="ap-btn" onclick="apRequestAccess(this)">Request access</button>';
  };

  // ── Notifications ─────────────────────────────────────────────────────────
  window.openNotif = function () { var d = document.getElementById('notif-drawer'); if (d) d.classList.add('open'); };
  window.closeNotif = function () { var d = document.getElementById('notif-drawer'); if (d) d.classList.remove('open'); };
  document.addEventListener('click', function (e) {
    var d = document.getElementById('notif-drawer');
    if (d && d.classList.contains('open') && !d.contains(e.target) && !e.target.closest('.sb-notif')) d.classList.remove('open');
  });

  // ── Profile menu ───────────────────────────────────────────────────────────
  var bot = document.getElementById('sb-bot');
  if (bot) {
    bot.addEventListener('click', function (e) {
      var m = document.getElementById('profile-menu');
      if (m) m.classList.toggle('open');
      e.stopPropagation();
    });
  }

})();

// Shared utilities for clinics sub-pages (staff, audit, settings, manufacturers)
(function () {

  // ── CUSTOM SELECT DROPDOWN (csd) ─────────────────────────────────────────
  window.csdToggle = function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    var wasOpen = el.classList.contains('open');
    document.querySelectorAll('.csd.open').forEach(function (e) { e.classList.remove('open'); });
    if (!wasOpen) el.classList.add('open');
  };

  window.csdPick = function (id, val, label) {
    var el = document.getElementById(id);
    if (!el) return;
    var btn = el.querySelector('.csd-btn');
    if (btn) {
      var _lbl = btn.querySelector('.csd-label');
      if (_lbl) { _lbl.textContent = label; }
      else {
        var _svg = btn.querySelector('svg');
        btn.textContent = label;
        if (_svg) btn.appendChild(_svg);
      }
      btn.classList.add('has-val');
    }
    var inp = el.querySelector('input[type=hidden]');
    if (inp) inp.value = val;
    el.classList.remove('open');
    el.querySelectorAll('.csd-opt').forEach(function (o) { o.classList.toggle('selected', o.dataset.val === val); });
    // Trigger change callbacks
    var cb = window['_csdCb_' + id];
    if (cb) cb(val, label);
  };

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.csd')) {
      document.querySelectorAll('.csd.open').forEach(function (el) { el.classList.remove('open'); });
    }
  });

  // ── SETTINGS TABS ─────────────────────────────────────────────────────────
  window.settingsTab = function (id, btn) {
    document.querySelectorAll('.stab-pane').forEach(function (p) { p.classList.remove('active'); });
    document.querySelectorAll('.stab-btn').forEach(function (b) { b.classList.remove('active'); });
    var pane = document.getElementById('stab-' + id);
    if (pane) pane.classList.add('active');
    if (btn) btn.classList.add('active');
    try { history.replaceState(null, '', '#' + id); } catch (e) {}
  };

  // Restore tab from hash
  (function () {
    var hash = (location.hash || '').slice(1);
    var valid = ['info', 'notifications', 'security', 'billing'];
    if (hash && valid.indexOf(hash) > -1) {
      var btn = document.querySelector('.stab-btn[data-tab="' + hash + '"]');
      settingsTab(hash, btn || null);
    }
  })();

  // ── AUDIT FILTERS ─────────────────────────────────────────────────────────
  document.querySelectorAll('.audit-filter-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.audit-filter-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var filter = btn.dataset.filter;
      document.querySelectorAll('.audit-row').forEach(function (row) {
        row.style.display = (filter === 'all' || row.dataset.type === filter) ? '' : 'none';
      });
    });
  });


  // ── EDIT ROLE MODAL ───────────────────────────────────────────────────────
  var _editRoleRowId = null;

  window.openEditRole = function (rowId, name, currentRole) {
    _editRoleRowId = rowId;
    var nameEl = document.getElementById('edit-role-name');
    if (nameEl) nameEl.textContent = 'Editing role for: ' + name;
    var label = currentRole.charAt(0).toUpperCase() + currentRole.slice(1);
    csdPick('edit-role-csd', currentRole, label);
    var inp = document.getElementById('edit-role-val');
    if (inp) inp.value = currentRole;
    var back = document.getElementById('edit-role-back');
    if (back) back.style.display = 'flex';
  };

  window.closeEditRole = function () {
    var back = document.getElementById('edit-role-back');
    if (back) back.style.display = 'none';
    _editRoleRowId = null;
  };

  window.saveEditRole = function () {
    var valEl = document.getElementById('edit-role-val');
    var val = valEl ? valEl.value : 'clinician';
    var label = val.charAt(0).toUpperCase() + val.slice(1);
    if (_editRoleRowId) {
      var row = document.getElementById(_editRoleRowId);
      if (row) {
        var badge = row.querySelector('.staff-role-badge');
        if (badge) {
          badge.className = 'staff-role-badge ' + val;
          badge.textContent = label;
        }
      }
    }
    closeEditRole();
  };

  // ── STAFF INVITE MODAL ────────────────────────────────────────────────────
  window.openInvite = function () {
    var el = document.getElementById('invite-back');
    if (el) el.style.display = 'flex';
  };
  window.closeInvite = function () {
    var el = document.getElementById('invite-back');
    if (el) el.style.display = 'none';
  };
  window.sendInvite = function () {
    var email = document.getElementById('invite-email');
    var roleEl = document.getElementById('invite-role');
    var e = email ? email.value.trim() : '';
    var role = roleEl ? (roleEl.value || 'Clinician') : 'Clinician';
    if (!e) return;
    closeInvite();
    var list = document.querySelector('.pending-list');
    if (!list) return;
    var row = document.createElement('div');
    row.className = 'staff-row';
    row.style.opacity = '0.75';
    row.innerHTML = '<div class="staff-av" style="background:var(--border);color:var(--muted)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" style="width:16px;height:16px"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg></div>'
      + '<div class="staff-info"><div class="staff-name">' + e + '</div><div class="staff-meta">Invitation just sent &middot; Expires in 7 days</div></div>'
      + '<div class="staff-role-badge ' + role.toLowerCase() + '">' + role + '</div>'
      + '<div style="color:var(--muted);font-size:13px">Just now</div><div></div>';
    list.appendChild(row);
    // Bump pending count
    var h3 = document.querySelector('.pending-count');
    if (h3) { var n = parseInt(h3.textContent) || 0; h3.textContent = n + 1; }
  };

})();

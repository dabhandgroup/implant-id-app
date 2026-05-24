// Manufacturer dashboard — conditional form logic + custom UI controls
(function () {

  // ── DEVICE TYPE CATALOGUE ────────────────────────────────────────────────
  const TYPES_BY_CATEGORY = {
    active: [
      { value: 'pacemaker-gen',  label: 'Pacemaker (generator / IPG)' },
      { value: 'pacemaker-lead', label: 'Pacemaker (pacing lead)' },
      { value: 'icd',            label: 'ICD (implantable defibrillator)' },
      { value: 'crtd',           label: 'CRT-D' },
      { value: 'crtp',           label: 'CRT-P' },
      { value: 'leadless',       label: 'Leadless pacemaker' },
      { value: 'sicd',           label: 'S-ICD' },
      { value: 'evicd',          label: 'EV-ICD' },
      { value: 'monitor',        label: 'Implantable loop recorder' },
      { value: 'cochlear',       label: 'Cochlear implant' },
      { value: 'dbs',            label: 'Deep brain stimulator (DBS)' },
      { value: 'scs',            label: 'Spinal cord stimulator (SCS)' },
      { value: 'pump',           label: 'Intrathecal drug pump' },
      { value: 'vns',            label: 'Vagus nerve stimulator' },
      { value: 'sns',            label: 'Sacral nerve stimulator' },
    ],
    passive: [
      { value: 'stent-vascular',   label: 'Vascular stent' },
      { value: 'stent-biliary',    label: 'Biliary stent' },
      { value: 'stent-coronary',   label: 'Coronary stent' },
      { value: 'stent-urological', label: 'Urological stent' },
      { value: 'clip-aneurysm',    label: 'Aneurysm clip' },
      { value: 'clip-haemostatic', label: 'Haemostatic clip' },
      { value: 'mesh',             label: 'Surgical mesh' },
      { value: 'joint',            label: 'Joint replacement (hip / knee / shoulder)' },
      { value: 'valve',            label: 'Heart valve (modern / MR conditional)' },
      { value: 'filter-ivc',       label: 'IVC filter' },
      { value: 'coil',             label: 'Embolisation coil' },
      { value: 'passive-other',    label: 'Other passive implant' },
    ],
    legacy: [
      { value: 'valve-legacy',  label: 'Pre-MRI era heart valve' },
      { value: 'shrapnel',      label: 'Metallic foreign body / shrapnel' },
      { value: 'prosthetic',    label: 'Early prosthetic (pre-MRI era)' },
      { value: 'legacy-other',  label: 'Other legacy / unverifiable device' },
    ],
  };

  // Field groups shown per device type
  const GROUPS_BY_TYPE = {
    default:         ['grp-classification', 'grp-sar', 'grp-timing', 'grp-regional', 'grp-docs', 'grp-cert'],
    'pacemaker-gen': ['grp-classification', 'grp-sar', 'grp-lead-group', 'grp-timing', 'grp-checklists', 'grp-regional', 'grp-docs', 'grp-cert'],
    'pacemaker-lead':['grp-classification', 'grp-sar', 'grp-lead-group', 'grp-timing', 'grp-regional', 'grp-docs', 'grp-cert'],
    'icd':           ['grp-classification', 'grp-sar', 'grp-lead-group', 'grp-timing', 'grp-checklists', 'grp-regional', 'grp-docs', 'grp-cert'],
    'crtd':          ['grp-classification', 'grp-sar', 'grp-lead-group', 'grp-timing', 'grp-checklists', 'grp-regional', 'grp-docs', 'grp-cert'],
    'crtp':          ['grp-classification', 'grp-sar', 'grp-lead-group', 'grp-timing', 'grp-checklists', 'grp-regional', 'grp-docs', 'grp-cert'],
    'cochlear':      ['grp-classification', 'grp-sar', 'grp-cochlear', 'grp-timing', 'grp-checklists', 'grp-regional', 'grp-docs', 'grp-cert'],
    'dbs':           ['grp-classification', 'grp-sar', 'grp-lead-group', 'grp-rep', 'grp-timing', 'grp-checklists', 'grp-regional', 'grp-docs', 'grp-cert'],
    'scs':           ['grp-classification', 'grp-sar', 'grp-lead-group', 'grp-timing', 'grp-checklists', 'grp-regional', 'grp-docs', 'grp-cert'],
    'pump':          ['grp-classification', 'grp-sar', 'grp-pump', 'grp-timing', 'grp-checklists', 'grp-regional', 'grp-docs', 'grp-cert'],
  };

  const ALL_GROUPS = [
    'grp-classification', 'grp-sar', 'grp-lead-group', 'grp-cochlear',
    'grp-pump', 'grp-rep', 'grp-timing', 'grp-checklists',
    'grp-passive', 'grp-regional', 'grp-docs', 'grp-cert',
  ];

  // ── CUSTOM SELECT ENGINE ─────────────────────────────────────────────────
  window.csToggle = function (btn) {
    var cs = btn.closest('.cs');
    if (cs.classList.contains('cs-disabled')) return;
    var wasOpen = cs.classList.contains('open');
    document.querySelectorAll('.cs.open').forEach(function (el) { el.classList.remove('open'); });
    if (!wasOpen) cs.classList.add('open');
  };

  // Category select
  window.csSelect = function (opt) {
    var cs = opt.closest('.cs');
    var val = opt.dataset.val;
    cs.querySelector('.cs-cur').textContent = opt.querySelector('.cs-opt-label').textContent;
    cs.querySelector('.cs-cur').classList.add('has-val');
    cs.querySelector('input.cs-hidden').value = val;
    cs.classList.remove('open');
    cs.querySelectorAll('.cs-opt').forEach(function (o) { o.classList.remove('selected'); });
    opt.classList.add('selected');
    if (cs.id === 'cs-category') onCategoryChange(val);
  };

  // Type select (populated dynamically)
  window.csTypeSelect = function (opt) {
    var cs = opt.closest('.cs');
    var val = opt.dataset.val;
    cs.querySelector('.cs-cur').textContent = opt.textContent.trim();
    cs.querySelector('.cs-cur').classList.add('has-val');
    cs.querySelector('input.cs-hidden').value = val;
    cs.classList.remove('open');
    cs.querySelectorAll('.cs-opt').forEach(function (o) { o.classList.remove('selected'); });
    opt.classList.add('selected');
    var cat = document.querySelector('#cs-category input.cs-hidden').value;
    onTypeChange(val, cat);
  };

  // Close dropdowns when clicking outside
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.cs')) {
      document.querySelectorAll('.cs.open').forEach(function (el) { el.classList.remove('open'); });
    }
  });

  // ── CONDITIONAL FORM LOGIC ───────────────────────────────────────────────
  function onCategoryChange(cat) {
    var types = TYPES_BY_CATEGORY[cat] || TYPES_BY_CATEGORY.active;

    // Populate the type custom dropdown
    var drop = document.getElementById('cs-type-drop');
    if (drop) {
      drop.innerHTML = types.map(function (t) {
        return '<button type="button" class="cs-opt" data-val="' + t.value +
               '" onclick="csTypeSelect(this)"><span>' + t.label + '</span></button>';
      }).join('');
    }

    // Enable + reset type selector
    var csType = document.getElementById('cs-type');
    if (csType) {
      csType.classList.remove('cs-disabled');
      var cur = csType.querySelector('.cs-cur');
      if (cur) { cur.textContent = 'Select device type…'; cur.classList.remove('has-val'); }
      var hidden = csType.querySelector('input.cs-hidden');
      if (hidden) hidden.value = '';
    }

    onTypeChange('', cat);
  }

  function onTypeChange(type, cat) {
    var show = GROUPS_BY_TYPE[type] || GROUPS_BY_TYPE.default;
    var isPassive = cat === 'passive';

    var pgEl = document.getElementById('grp-passive');
    if (pgEl) pgEl.style.display = isPassive ? '' : 'none';

    ALL_GROUPS.forEach(function (g) {
      if (g === 'grp-passive') return;
      var el = document.getElementById(g);
      if (el) el.style.display = show.includes(g) ? '' : 'none';
    });
  }

  // ── SIGNATURE CANVAS ─────────────────────────────────────────────────────
  function initSigCanvas(canvasId, wrapId) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var wrap = document.getElementById(wrapId);
    var ctx = canvas.getContext('2d');
    var drawing = false;

    function getPos(e) {
      var rect = canvas.getBoundingClientRect();
      var scaleX = canvas.width / rect.width;
      var scaleY = canvas.height / rect.height;
      if (e.touches) {
        return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
      }
      return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    }

    function startDraw(e) {
      e.preventDefault();
      drawing = true;
      var pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }

    function doDraw(e) {
      if (!drawing) return;
      e.preventDefault();
      var pos = getPos(e);
      ctx.strokeStyle = '#0e2a33';
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      if (wrap) wrap.classList.add('has-sig');
    }

    function stopDraw() { drawing = false; }

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', doDraw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', doDraw, { passive: false });
    canvas.addEventListener('touchend', stopDraw);
  }

  window.clearSig = function (canvasId, wrapId) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var wrap = document.getElementById(wrapId);
    if (wrap) wrap.classList.remove('has-sig');
  };

  window.sigTab = function (btn, showId, hideId) {
    var block = btn.closest('.sig-block');
    block.querySelectorAll('.sig-tab').forEach(function (t) { t.classList.remove('active'); });
    btn.classList.add('active');
    document.getElementById(showId).style.display = '';
    document.getElementById(hideId).style.display = 'none';
  };

  // ── DEVICE EDIT DRAWER ───────────────────────────────────────────────────
  window.openDevEdit = function (btn) {
    var row = btn.closest('tr');
    var name = row ? row.querySelector('.dev-name').textContent : '';
    var models = row ? row.querySelector('.dev-models').textContent : '';
    var el = document.getElementById('dev-edit-name');
    if (el) el.value = name;
    var el2 = document.getElementById('dev-edit-models');
    if (el2) el2.value = models;
    document.getElementById('dev-edit-back').classList.add('open');
    document.getElementById('dev-edit-panel').classList.add('open');
  };
  window.closeDevEdit = function () {
    document.getElementById('dev-edit-back').classList.remove('open');
    document.getElementById('dev-edit-panel').classList.remove('open');
  };

  // ── REGIONAL APPROVALS ACCORDION ─────────────────────────────────────────
  function initRegional() {
    document.querySelectorAll('.reg-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var body = btn.nextElementSibling;
        var open = body && body.style.display !== 'none';
        document.querySelectorAll('.reg-body').forEach(function (b) { b.style.display = 'none'; });
        document.querySelectorAll('.reg-toggle').forEach(function (b) { b.classList.remove('open'); });
        if (!open && body) { body.style.display = ''; btn.classList.add('open'); }
      });
    });
    var first = document.querySelector('.reg-toggle');
    if (first) first.click();
  }

  // ── INIT ─────────────────────────────────────────────────────────────────
  // NOTE: scripts load via afterInteractive — DOMContentLoaded has already fired.
  // Call init directly; DOM is fully available.
  function init() {
    // Hide all conditional groups on load
    ALL_GROUPS.forEach(function (g) {
      var el = document.getElementById(g);
      if (el) el.style.display = 'none';
    });
    initRegional();
    initSigCanvas('sig-canvas', 'sig-canvas-wrap');
    initSigCanvas('bulk-sig-canvas', 'bulk-sig-canvas-wrap');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Escape key closes edit drawer
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeDevEdit();
  });

})();

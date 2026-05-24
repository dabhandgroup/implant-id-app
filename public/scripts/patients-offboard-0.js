// patients-offboard-0.js — Delete account offboarding flow

var _currentStep = 1;
var _sigCanvas = null;
var _sigCtx = null;
var _sigDrawing = false;
var _sigHasMark = false;
var _sigLast = { x: 0, y: 0 };

// ---------- Step navigation ----------

function nextStep(n) {
  showStep(n);
}

function prevStep(n) {
  showStep(n);
}

function showStep(n) {
  // Hide all steps
  for (var i = 1; i <= 5; i++) {
    var el = document.getElementById('ob-step-' + i);
    if (el) el.style.display = 'none';
  }
  // Show target
  var target = document.getElementById('ob-step-' + n);
  if (target) target.style.display = '';

  // Update progress indicator
  updateProgress(n);
  _currentStep = n;

  // Scroll to top of ob-wrap
  var wrap = document.querySelector('.ob-wrap');
  if (wrap) wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Init canvas on step 4
  if (n === 4) {
    initCanvas();
    setDateField();
  }
}

function updateProgress(activeStep) {
  for (var i = 1; i <= 4; i++) {
    var ps = document.getElementById('ps-' + i);
    var line = document.querySelectorAll('.ob-prog-line')[i - 1];
    if (!ps) continue;
    ps.classList.remove('active', 'done');
    if (i < activeStep) {
      ps.classList.add('done');
      if (line) line.classList.add('done');
    } else if (i === activeStep) {
      ps.classList.add('active');
      if (line) line.classList.remove('done');
    } else {
      if (line) line.classList.remove('done');
    }
  }
  // Hide progress on step 5
  var prog = document.getElementById('ob-progress');
  if (prog) prog.style.display = (activeStep === 5) ? 'none' : '';
}

// ---------- Reason selection (step 2) ----------

function selectReason(labelEl) {
  var radio = labelEl ? labelEl.querySelector('input[type="radio"]') : null;
  if (!radio) return;
  var val = radio.value;
  var otherWrap = document.getElementById('ob-other-wrap');
  if (otherWrap) {
    otherWrap.style.display = (val === 'other') ? '' : 'none';
  }
}

// ---------- Signature canvas ----------

function initCanvas() {
  _sigCanvas = document.getElementById('sig-canvas');
  if (!_sigCanvas) return;
  _sigCtx = _sigCanvas.getContext('2d');

  // Scale for device pixel ratio
  var dpr = window.devicePixelRatio || 1;
  var rect = _sigCanvas.getBoundingClientRect();
  _sigCanvas.width = rect.width * dpr;
  _sigCanvas.height = rect.height * dpr;
  _sigCtx.scale(dpr, dpr);
  _sigCtx.lineWidth = 2;
  _sigCtx.lineCap = 'round';
  _sigCtx.lineJoin = 'round';
  _sigCtx.strokeStyle = '#0e2a33';

  // Mouse events
  _sigCanvas.addEventListener('mousedown', sigStart);
  _sigCanvas.addEventListener('mousemove', sigMove);
  _sigCanvas.addEventListener('mouseup', sigEnd);
  _sigCanvas.addEventListener('mouseleave', sigEnd);

  // Touch events
  _sigCanvas.addEventListener('touchstart', function (e) { e.preventDefault(); sigStart(e.touches[0]); }, { passive: false });
  _sigCanvas.addEventListener('touchmove', function (e) { e.preventDefault(); sigMove(e.touches[0]); }, { passive: false });
  _sigCanvas.addEventListener('touchend', sigEnd);
}

function getSigPos(e) {
  var rect = _sigCanvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left),
    y: (e.clientY - rect.top)
  };
}

function sigStart(e) {
  _sigDrawing = true;
  var pos = getSigPos(e);
  _sigLast = pos;
  _sigCtx.beginPath();
  _sigCtx.moveTo(pos.x, pos.y);

  // Hide hint
  var hint = document.getElementById('canvas-hint');
  if (hint) hint.style.opacity = '0';
}

function sigMove(e) {
  if (!_sigDrawing) return;
  var pos = getSigPos(e);
  _sigCtx.beginPath();
  _sigCtx.moveTo(_sigLast.x, _sigLast.y);
  _sigCtx.lineTo(pos.x, pos.y);
  _sigCtx.stroke();
  _sigLast = pos;
  _sigHasMark = true;
}

function sigEnd() {
  _sigDrawing = false;
}

function clearSig() {
  if (!_sigCtx || !_sigCanvas) return;
  var dpr = window.devicePixelRatio || 1;
  _sigCtx.clearRect(0, 0, _sigCanvas.width / dpr, _sigCanvas.height / dpr);
  _sigHasMark = false;
  var hint = document.getElementById('canvas-hint');
  if (hint) hint.style.opacity = '1';
  checkCanSubmit();
}

// ---------- Date field ----------

function setDateField() {
  var field = document.getElementById('confirm-date');
  if (!field) return;
  var now = new Date();
  var opts = { day: 'numeric', month: 'long', year: 'numeric' };
  field.value = now.toLocaleDateString('en-GB', opts);
}

// ---------- Submit readiness ----------

function checkCanSubmit() {
  var c1 = document.getElementById('chk-1');
  var c2 = document.getElementById('chk-2');
  var c3 = document.getElementById('chk-3');
  var c4 = document.getElementById('chk-4');
  var name = document.getElementById('confirm-name');
  var btn = document.getElementById('submit-btn');
  if (!c1 || !c2 || !c3 || !c4 || !name || !btn) return;

  var allChecked = c1.checked && c2.checked && c3.checked && c4.checked;
  var hasName = name.value.trim().length > 0;

  btn.disabled = !(allChecked && hasName);
}

// ---------- Submit ----------

function submitDeletion() {
  showStep(5);
}

// ---------- Init ----------

document.addEventListener('DOMContentLoaded', function () {
  // Show step 1 on load
  showStep(1);
});

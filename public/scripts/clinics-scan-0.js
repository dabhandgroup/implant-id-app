// clinics-scan-0.js — Scan patient card page interactions

var _scanActive = false;
var _scanTimer = null;

function doLookup() {
  var input = document.getElementById('lookup-input');
  var val = input ? input.value.trim() : '';
  var empty = document.getElementById('lookup-empty');
  var result = document.getElementById('lookup-result');

  if (!val) {
    input && (input.style.borderColor = 'var(--err)');
    setTimeout(function () { input && (input.style.borderColor = ''); }, 1200);
    return;
  }

  // Simulate lookup — always returns the demo result card
  if (empty) empty.style.display = 'none';
  if (result) result.style.display = 'flex';
}

function startScan() {
  var btn = document.getElementById('scan-btn');
  var viewfinder = document.getElementById('viewfinder');
  var vfIdle = document.getElementById('vf-idle');
  var vfScanning = document.getElementById('vf-scanning');

  if (_scanActive) {
    // Stop scanning
    _scanActive = false;
    if (_scanTimer) clearTimeout(_scanTimer);
    if (vfIdle) vfIdle.style.display = '';
    if (vfScanning) vfScanning.style.display = 'none';
    if (viewfinder) viewfinder.classList.remove('scanning');
    if (btn) btn.textContent = 'Start scanning';
    return;
  }

  _scanActive = true;
  if (vfIdle) vfIdle.style.display = 'none';
  if (vfScanning) vfScanning.style.display = '';
  if (viewfinder) viewfinder.classList.add('scanning');
  if (btn) btn.textContent = 'Stop scanning';

  // Demo: after 3s, auto-fill a code and show results
  _scanTimer = setTimeout(function () {
    _scanActive = false;
    if (vfIdle) vfIdle.style.display = '';
    if (vfScanning) vfScanning.style.display = 'none';
    if (viewfinder) viewfinder.classList.remove('scanning');
    if (btn) btn.textContent = 'Start scanning';

    var input = document.getElementById('lookup-input');
    if (input) input.value = 'TH-4821-IID';
    doLookup();
    showToast('QR code scanned — record found');
  }, 3000);
}

function requestAccess() {
  showToast('Access request sent to patient');
}

function showToast(msg) {
  var t = document.getElementById('scan-toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function () { t.classList.remove('show'); }, 3000);
}

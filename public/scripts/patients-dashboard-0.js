// Patient data for pass/PDF (demo)
window.IID_PATIENT = window.IID_PATIENT || {
  id: 'TH-4821-IID',
  name: 'Trevor Hughes',
  dob: '14 Aug 1978',
  implant: 'Medtronic Azure XT DR',
  model: 'W3DR01',
  serial: 'PPM-22841-8803',
  implanted: '12 Mar 2023',
  surgeon: 'Dr A. Russo · St Vincent\'s',
  status: 'MR Conditional 1.5T / 3T',
  sar: '2.0 W/kg',
  gradient: '200 T/m/s',
  verified: '14 Apr 2026',
  emergency: 'Paul Hughes · +44 7700 900123',
  allergies: 'Penicillin'
};

function passUrl(){
  return (location.origin || 'https://implantid.io') + '/pass/' + (window.IID_PATIENT.id);
}

function loadQR(){
  var url = passUrl();
  var img = document.getElementById('wall-qr-img');
  if (img) img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data=' + encodeURIComponent(url);
  var a = document.getElementById('btn-apple-wall');
  // Apple Wallet: normally would point to a signed .pkpass URL. Use the pass URL; Safari will recognise the MIME and offer to add.
  if (a) a.href = url + '.pkpass';
  var g = document.getElementById('btn-google-wall');
  // Google Wallet add-to-wallet URL pattern
  if (g) g.href = 'https://pay.google.com/gp/v/save/' + encodeURIComponent(btoa(JSON.stringify({id: window.IID_PATIENT.id, name: window.IID_PATIENT.name})));
}

function copyPassLink(btn){
  var url = passUrl();
  if (navigator.clipboard) navigator.clipboard.writeText(url);
  var orig = btn.innerHTML;
  btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg> Link copied';
  setTimeout(function(){ btn.innerHTML = orig; }, 1800);
}

function openWall(){ document.getElementById('wall').classList.add('open'); loadQR(); }
function closeWall(){ document.getElementById('wall').classList.remove('open'); }
function setWmode(m){
  document.querySelectorAll('.wtab').forEach(function(b){b.classList.toggle('active', b.dataset.wmode===m)});
  document.getElementById('wmode-wallet').style.display = m==='wallet' ? 'block' : 'none';
  document.getElementById('wmode-email').style.display  = m==='email'  ? 'block' : 'none';
  document.getElementById('wall-title').textContent = m==='email' ? 'Email your record to the clinic' : 'Share your implant record';
}
document.addEventListener('keydown', function(e){ if (e.key==='Escape') closeWall(); });

// Proper PDF via jsPDF (loaded from CDN)
function downloadRecordPDF(){
  if (typeof window.jspdf === 'undefined'){
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = buildPDF;
    document.head.appendChild(s);
  } else buildPDF();
}
function buildPDF(){
  var P = window.IID_PATIENT;
  var { jsPDF } = window.jspdf;
  var doc = new jsPDF({unit:'pt', format:'a4'});
  var W = 595.28;
  // Header band
  doc.setFillColor(21, 80, 99); doc.rect(0, 0, W, 100, 'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(22); doc.setTextColor(255,255,255);
  doc.text('Implant ID', 40, 50);
  doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.setTextColor(200,230,240);
  doc.text('MRI implant safety record · implantid.io', 40, 68);
  doc.setFontSize(9); doc.text('Generated ' + new Date().toLocaleString(), 40, 82);
  // Patient band
  doc.setFillColor(246,245,241); doc.rect(0, 100, W, 80, 'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(20); doc.setTextColor(14,42,51);
  doc.text(P.name, 40, 132);
  doc.setFont('helvetica','normal'); doc.setFontSize(11); doc.setTextColor(80,110,120);
  doc.text('Patient ID ' + P.id + '  ·  DOB ' + P.dob, 40, 150);
  // Status pill
  doc.setFillColor(47,158,114); doc.roundedRect(40, 158, 200, 16, 8, 8, 'F');
  doc.setFontSize(9); doc.setTextColor(255,255,255); doc.setFont('helvetica','bold');
  doc.text(P.status, 48, 170);
  // Body
  var y = 220;
  function section(title){
    doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(41,134,159);
    doc.text(title.toUpperCase(), 40, y);
    doc.setDrawColor(220,220,220); doc.line(40, y+4, W-40, y+4);
    y += 20;
  }
  function row(k, v){
    doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(120,130,140);
    doc.text(k, 40, y);
    doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(14,42,51);
    doc.text(String(v), 180, y);
    y += 20;
  }
  section('Implant details');
  row('Device',        P.implant);
  row('Manufacturer',  'Medtronic');
  row('Model',         P.model);
  row('Serial',        P.serial);
  row('Implanted',     P.implanted);
  row('Implanting surgeon', P.surgeon);
  y += 8;
  section('MRI safety conditions');
  row('MRI status',        P.status);
  row('Max SAR',           P.sar);
  row('Max gradient',      P.gradient);
  row('Scan region',       'Full body');
  row('Mode required',     'MRI SureScan');
  row('Post-scan check',   'Required');
  row('Last verified',     P.verified);
  y += 8;
  section('Emergency information');
  row('Next of kin',       P.emergency);
  row('Known allergies',   P.allergies);
  // Footer
  doc.setFontSize(8); doc.setTextColor(150,160,170);
  doc.text('This record is signed and verified by Implant ID · HIPAA-grade · Valid at every network clinic.', 40, 800);
  doc.text('If printed, please hand to the MRI technologist before your scan.', 40, 814);

  doc.save('implant-id-' + P.id + '.pdf');
}
window.downloadRecordPDF = downloadRecordPDF;
/* Implant ID — barcode/QR/code scanner.
   Uses BarcodeDetector API natively where available (Chrome / Edge / Android).
   Falls back to @zxing/browser via CDN for everything else (incl. iOS Safari).
   Usage: openScanner('home-q')  // populates the input id and triggers its 'input' event */
(function(){
  if (window.openScanner) return; // already loaded

  var STYLE = `
    .iid-scan-back{position:fixed;inset:0;background:rgba(5,14,17,.92);backdrop-filter:blur(8px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:0;opacity:0;transition:opacity .18s}
    .iid-scan-back.on{opacity:1}
    .iid-scan-modal{width:100%;max-width:520px;height:100%;max-height:760px;background:#0a1418;border-radius:0;display:flex;flex-direction:column;overflow:hidden;position:relative;color:#eaf4f7;font-family:'Sora',system-ui,sans-serif}
    @media(min-width:560px){.iid-scan-modal{border-radius:18px;height:auto;max-height:90vh}}
    .iid-scan-h{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid rgba(234,244,247,.08)}
    .iid-scan-h h3{font-size:15.5px;font-weight:500;letter-spacing:-.01em;margin:0}
    .iid-scan-x{background:transparent;border:0;color:rgba(234,244,247,.7);cursor:pointer;width:34px;height:34px;border-radius:99px;display:grid;place-items:center}
    .iid-scan-x:hover{color:#fff;background:rgba(234,244,247,.08)}
    .iid-scan-vid-wrap{position:relative;flex:1;background:#000;min-height:300px;overflow:hidden}
    .iid-scan-vid{width:100%;height:100%;object-fit:cover;display:block}
    .iid-scan-frame{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none}
    .iid-scan-frame .box{width:78%;max-width:340px;aspect-ratio:5/3;border:2px solid rgba(125,225,255,.7);border-radius:14px;box-shadow:0 0 0 9999px rgba(5,14,17,.4);position:relative}
    .iid-scan-frame .corner{position:absolute;width:20px;height:20px;border:3px solid #7de1ff}
    .iid-scan-frame .c-tl{top:-3px;left:-3px;border-right:0;border-bottom:0;border-radius:7px 0 0 0}
    .iid-scan-frame .c-tr{top:-3px;right:-3px;border-left:0;border-bottom:0;border-radius:0 7px 0 0}
    .iid-scan-frame .c-bl{bottom:-3px;left:-3px;border-right:0;border-top:0;border-radius:0 0 0 7px}
    .iid-scan-frame .c-br{bottom:-3px;right:-3px;border-left:0;border-top:0;border-radius:0 0 7px 0}
    .iid-scan-laser{position:absolute;left:0;right:0;top:50%;height:2px;background:linear-gradient(90deg,transparent,#7de1ff,transparent);animation:iidScanPulse 2s ease-in-out infinite}
    @keyframes iidScanPulse{0%,100%{transform:translateY(-40%);opacity:.4}50%{transform:translateY(40%);opacity:1}}
    .iid-scan-foot{padding:18px 22px;border-top:1px solid rgba(234,244,247,.08);background:#0a1418}
    .iid-scan-status{font-size:13.5px;color:rgba(234,244,247,.78);text-align:center;line-height:1.4;font-family:system-ui,sans-serif}
    .iid-scan-status b{color:#7de1ff;font-weight:600}
    .iid-scan-status.error{color:#ff8a7a}
    .iid-scan-status.success{color:#7de1ff}
    .iid-scan-manual{display:flex;gap:8px;margin-top:14px;background:rgba(234,244,247,.06);border:1px solid rgba(234,244,247,.14);border-radius:10px;padding:4px;align-items:center}
    .iid-scan-manual input{flex:1;background:transparent;border:0;outline:0;color:#fff;font-family:system-ui,sans-serif;font-size:14px;padding:9px 12px;min-width:0}
    .iid-scan-manual input::placeholder{color:rgba(234,244,247,.45)}
    .iid-scan-manual button{background:#29a8cc;color:#051418;border:0;font-family:'Sora',system-ui,sans-serif;font-size:13px;font-weight:600;padding:8px 14px;border-radius:7px;cursor:pointer}
    .iid-scan-manual button:hover{background:#7de1ff}
  `;
  var s = document.createElement('style'); s.textContent = STYLE; document.head.appendChild(s);

  var ZXING_SRC = 'https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/umd/index.min.js';
  var zxingPromise = null;

  function loadZXing(){
    if (zxingPromise) return zxingPromise;
    zxingPromise = new Promise(function(resolve, reject){
      if (window.ZXingBrowser) return resolve(window.ZXingBrowser);
      var sc = document.createElement('script');
      sc.src = ZXING_SRC;
      sc.onload = function(){ resolve(window.ZXingBrowser); };
      sc.onerror = function(){ reject(new Error('Could not load barcode library')); };
      document.head.appendChild(sc);
    });
    return zxingPromise;
  }

  function buildModal(){
    var back = document.createElement('div');
    back.className = 'iid-scan-back';
    back.innerHTML = `
      <div class="iid-scan-modal">
        <div class="iid-scan-h">
          <h3>Scan a device</h3>
          <button class="iid-scan-x" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="iid-scan-vid-wrap">
          <video class="iid-scan-vid" playsinline muted autoplay></video>
          <div class="iid-scan-frame">
            <div class="box">
              <span class="corner c-tl"></span>
              <span class="corner c-tr"></span>
              <span class="corner c-bl"></span>
              <span class="corner c-br"></span>
              <span class="iid-scan-laser"></span>
            </div>
          </div>
        </div>
        <div class="iid-scan-foot">
          <div class="iid-scan-status">Point the camera at the barcode on the implant card or device.</div>
          <div class="iid-scan-manual">
            <input type="text" placeholder="…or type the model number" />
            <button type="button">Use</button>
          </div>
        </div>
      </div>
    `;
    return back;
  }

  function setStatus(modal, msg, kind){
    var st = modal.querySelector('.iid-scan-status');
    st.innerHTML = msg;
    st.className = 'iid-scan-status' + (kind ? ' ' + kind : '');
  }

  window.openScanner = async function(targetInputId){
    var input = document.getElementById(targetInputId);
    if (!input){ alert('Search field not found.'); return; }

    var modal = buildModal();
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function(){ modal.classList.add('on'); });

    var video = modal.querySelector('video');
    var stream = null;
    var stopped = false;
    var nativeDetector = null;
    var nativeRaf = 0;
    var zxingControls = null;

    function fillAndClose(value){
      if (stopped) return;
      stopped = true;
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      cleanup();
      setTimeout(function(){
        // Trigger search if user has bottom button (works on home/clinics).
        var btn = input.closest('.big-search') && input.closest('.big-search').querySelector('.go-btn');
        if (btn) btn.click();
      }, 250);
    }

    function cleanup(){
      try { if (zxingControls && zxingControls.stop) zxingControls.stop(); } catch(e){}
      cancelAnimationFrame(nativeRaf);
      if (stream){ stream.getTracks().forEach(function(t){ t.stop(); }); stream = null; }
      modal.classList.remove('on');
      setTimeout(function(){ if (modal.parentNode) modal.parentNode.removeChild(modal); document.body.style.overflow = ''; }, 200);
    }

    // Wire close handlers
    modal.querySelector('.iid-scan-x').addEventListener('click', function(){ stopped = true; cleanup(); });
    modal.addEventListener('click', function(e){ if (e.target === modal){ stopped = true; cleanup(); } });
    document.addEventListener('keydown', function escH(e){ if (e.key === 'Escape'){ stopped = true; cleanup(); document.removeEventListener('keydown', escH); } });

    // Manual input fallback
    var manualInput = modal.querySelector('.iid-scan-manual input');
    var manualBtn = modal.querySelector('.iid-scan-manual button');
    manualInput.addEventListener('keydown', function(e){ if (e.key === 'Enter'){ var v = manualInput.value.trim(); if (v) fillAndClose(v); }});
    manualBtn.addEventListener('click', function(){ var v = manualInput.value.trim(); if (v) fillAndClose(v); });

    // Get camera
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
    } catch (err) {
      setStatus(modal, 'Couldn\'t open the camera. ' + (err && err.message ? err.message : '') + '<br>Type the model number below to search.', 'error');
      return;
    }
    video.srcObject = stream;
    await new Promise(function(r){ video.onloadedmetadata = r; });
    video.play().catch(function(){});

    setStatus(modal, 'Looking for a barcode…');

    // Path 1: native BarcodeDetector
    if ('BarcodeDetector' in window){
      try {
        var fmts = await window.BarcodeDetector.getSupportedFormats();
        nativeDetector = new window.BarcodeDetector({ formats: fmts });
        var loop = async function(){
          if (stopped) return;
          try {
            var barcodes = await nativeDetector.detect(video);
            if (barcodes && barcodes[0] && barcodes[0].rawValue){
              setStatus(modal, 'Found <b>' + barcodes[0].rawValue + '</b> — searching…', 'success');
              return fillAndClose(barcodes[0].rawValue);
            }
          } catch(e){}
          nativeRaf = requestAnimationFrame(loop);
        };
        loop();
        return;
      } catch(e){
        // fall through to ZXing
      }
    }

    // Path 2: ZXing fallback
    try {
      setStatus(modal, 'Loading scanner…');
      var ZX = await loadZXing();
      var reader = new ZX.BrowserMultiFormatReader();
      setStatus(modal, 'Looking for a barcode…');
      zxingControls = await reader.decodeFromVideoElement(video, function(result, err){
        if (result && !stopped){
          setStatus(modal, 'Found <b>' + result.text + '</b> — searching…', 'success');
          fillAndClose(result.text);
        }
      });
    } catch (err) {
      setStatus(modal, 'Scanner unavailable on this browser. Type the model number below.', 'error');
    }
  };
})();

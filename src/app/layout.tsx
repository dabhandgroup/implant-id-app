import type { Metadata, Viewport } from 'next'
import '@/styles/globals.css'
import Providers from './providers'
import AppNav from '@/components/AppNav'
import CookieBanner from '@/components/CookieBanner'
// GlobalSearch removed — master admin now uses the live Convex-backed search in MasterShell

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'Implant ID',
  description: 'The modern database for MRI-conditional implants.',
  icons: {
    icon: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Polyfills + diagnostic for iOS 15 / Safari 15 — runs before the Next.js bundle */}
        <script dangerouslySetInnerHTML={{__html:`
(function(){
  // ── Error overlay (catches syntax errors in the bundle too) ──────────────
  function _dbg(msg){
    var b=document.getElementById('__iid_d');
    if(!b){b=document.createElement('div');b.id='__iid_d';b.style.cssText='position:fixed;bottom:0;left:0;right:0;background:#b00;color:#fff;padding:8px 10px;z-index:9999999;font:11px/1.5 monospace;word-break:break-all;max-height:160px;overflow-y:auto;white-space:pre-wrap';}
    b.textContent+=msg+'\n';
    if(document.body)document.body.appendChild(b);else document.addEventListener('DOMContentLoaded',function(){document.body.appendChild(b);});
  }
  window.addEventListener('error',function(e){_dbg('[ERR] '+e.message+(e.filename?' @ '+e.filename.split('/').pop().split('?')[0]+':'+e.lineno:''));},true);
  window.addEventListener('unhandledrejection',function(e){_dbg('[REJ] '+((e.reason&&(e.reason.stack||e.reason.message||String(e.reason)))||'?').slice(0,400));});
  window.addEventListener('load',function(){
    setTimeout(function(){
      if(!document.documentElement.dataset.r){
        var b=document.createElement('div');b.style.cssText='position:fixed;top:84px;left:0;right:0;background:#c60;color:#fff;padding:10px;z-index:9999999;font:12px monospace;text-align:center';
        b.textContent='[DEBUG] React did not mount. See red error above, or connect iPad to Mac and use Safari > Develop menu.';
        document.body&&document.body.appendChild(b);
      }
    },8000);
  });
  // ── Polyfills ─────────────────────────────────────────────────────────────
  var AP=Array.prototype;
  if(!AP.toSorted)AP.toSorted=function(fn){return[].concat(this).sort(fn)};
  if(!AP.toReversed)AP.toReversed=function(){return[].concat(this).reverse()};
  if(!AP.toSpliced)AP.toSpliced=function(s,d){var a=[].concat(this);a.splice.apply(a,[s,d].concat([].slice.call(arguments,2)));return a};
  if(!AP['with'])AP['with']=function(i,v){var a=[].concat(this);a[i<0?a.length+i:i]=v;return a};
  if(!AP.findLast){
    AP.findLast=function(fn,t){for(var i=this.length-1;i>=0;i--)if(fn.call(t,this[i],i,this))return this[i]};
    AP.findLastIndex=function(fn,t){for(var i=this.length-1;i>=0;i--)if(fn.call(t,this[i],i,this))return i;return -1};
  }
  if(typeof Promise!=='undefined'&&!Promise.withResolvers)Promise.withResolvers=function(){var r,j;var p=new Promise(function(a,b){r=a;j=b});return{promise:p,resolve:r,reject:j}};
  if(!Object.groupBy)Object.groupBy=function(it,fn){var res=Object.create(null),i=0;try{for(var v of it){var k=fn(v,i++);if(!(k in res))res[k]=[];res[k].push(v)}}catch(e){}return res};
  if(typeof Map!=='undefined'&&!Map.groupBy)Map.groupBy=function(it,fn){var res=new Map,i=0;try{for(var v of it){var k=fn(v,i++);if(!res.has(k))res.set(k,[]);res.get(k).push(v)}}catch(e){}return res};
  if(typeof structuredClone==='undefined')window.structuredClone=function(o){return JSON.parse(JSON.stringify(o))};
})();`}} />
        {/* Graceful fallback for browsers too old to run the app (iOS < 13.4, Chrome < 85) */}
        <script dangerouslySetInnerHTML={{__html:`if(typeof String.prototype.replaceAll==='undefined'){document.addEventListener('DOMContentLoaded',function(){var e=document.createElement('div');e.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:#0a0f1a;color:#fff;z-index:99999;text-align:center;padding:60px 24px;box-sizing:border-box;font-family:system-ui,-apple-system,sans-serif';e.innerHTML='<p style="font-size:36px;margin:0 0 20px">⚠️</p><h2 style="font-size:20px;font-weight:600;margin:0 0 10px">Browser not supported</h2><p style="font-size:14px;color:rgba(255,255,255,.6);max-width:300px;margin:0 auto;line-height:1.6">Please update Chrome or use a newer device to access Implant ID.</p>';document.body.appendChild(e)})}`}} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <AppNav />
          {children}
          <CookieBanner />
        </Providers>
      </body>
    </html>
  )
}
/* Lightbase Edge 0.1.16 — service worker reverse proxy (BismiLLAH).
   Serves navigations and dynamic requests with TRUE SSR responses from the
   Lightbase edge gateway — correct status codes, POST bodies, redirects,
   cookie jar — while static assets bypass to the unmetered Pages CDN.
   Wire protocol v3.1: ZERO custom headers (preflight-free):
     __lbjar=<jar>      cookie jar      __lbmethod=<M>  method tunnel
     __lbct=<ctype>     content-type override (JSON-as-text/plain)
   ZERO CF Workers: this worker runs in the browser, not on Cloudflare. */
var CFG={"lbUrl":"https://lightbase-10133292663.development.catalystappsail.com","projectId":"careconnect","appId":"careconnect","gateway":"https://lightbase-10133292663.development.catalystappsail.com/api/v1/projects/careconnect/edge/gw/careconnect","assetPrefixes":["/assets/","/fonts/","/images/","/favicon","/icons/"],"name":"CareConnect","description":"CareConnect — healthcare ecosystem for clinics and patients.","themeColor":"#0b3d2e"};

function lbErrDoc(status, kind){
  kind = kind || (status === 404 ? 'notfound' : (status === 429 ? 'warming' : 'hiccup'));
  var K = {
    notfound: { pill: '404 — not found', title: 'This page could not be rendered',
      desc: 'The edge could not find a renderer for this route. It may appear after the next publish, or the link may be outdated.',
      retry: false, home: true },
    warming: { pill: 'Edge warming up', title: 'Preparing a fresh render for you',
      desc: 'This app is loading onto the Lightbase edge runtime. Your place is held — the page opens automatically.',
      retry: true, home: false },
    hiccup: { pill: 'Edge hiccup', title: 'The edge hit a temporary snag',
      desc: 'The render did not complete this time. Retrying usually resolves it instantly.',
      retry: true, home: true },
    network: { pill: 'Reconnecting', title: 'Reconnecting to the edge',
      desc: 'The connection to the render plane dropped. Retrying automatically…',
      retry: true, home: false }
  }[kind] || { pill: 'Edge hiccup', title: 'The edge hit a temporary snag', desc: 'Retrying usually resolves it instantly.', retry: true, home: true };
  function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  var css = ''
    + '*{box-sizing:border-box}'
    + '.lb-err{position:fixed;inset:0;display:grid;place-items:center;padding:24px;margin:0;'
    + 'font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#e8eefc;'
    + 'background:radial-gradient(1100px 560px at 50% -8%,#182647 0%,#0b1020 62%) no-repeat #0b1020}'
    + '@media (prefers-color-scheme:light){.lb-err{color:#0f172a;'
    + 'background:radial-gradient(1100px 560px at 50% -8%,#ffffff 0%,#eef2f9 62%) no-repeat #eef2f9}}'
    + '.lb-err__card{max-width:430px;width:100%;border-radius:18px;padding:34px 30px 26px;text-align:center;'
    + 'background:rgba(255,255,255,.045);border:1px solid rgba(148,163,184,.18);box-shadow:0 24px 60px -24px rgba(2,6,23,.55)}'
    + '@media (prefers-color-scheme:light){.lb-err__card{background:#fff;border-color:#e2e8f0;box-shadow:0 24px 60px -30px rgba(15,23,42,.25)}}'
    + '.lb-err__spin{width:26px;height:26px;border-radius:50%;border:2.5px solid rgba(148,163,184,.28);'
    + 'border-top-color:#10b981;animation:lberr 0.8s linear infinite;margin:0 auto 16px}'
    + '@keyframes lberr{to{transform:rotate(360deg)}}'
    + '.lb-err__pill{display:inline-block;font-size:.66rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;'
    + 'color:#10b981;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.28);border-radius:999px;padding:5px 12px;margin-bottom:18px}'
    + '.lb-err__t{font-size:1.28rem;font-weight:650;line-height:1.25;margin:0 0 10px;letter-spacing:-.01em}'
    + '.lb-err__d{font-size:.9rem;line-height:1.6;opacity:.72;margin:0 0 22px}'
    + '.lb-err__row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin:0 0 6px}'
    + '.lb-err__btn{display:inline-block;appearance:none;border:0;border-radius:11px;padding:10px 20px;'
    + 'font-size:.86rem;font-weight:600;cursor:pointer;text-decoration:none;'
    + 'background:linear-gradient(135deg,#10b981,#0ea5e9);color:#04211a;transition:transform .12s ease,box-shadow .12s ease}'
    + '.lb-err__btn:hover{transform:translateY(-1px);box-shadow:0 10px 24px -10px rgba(14,165,233,.5)}'
    + '.lb-err__btn--ghost{background:transparent;color:inherit;border:1px solid rgba(148,163,184,.4)}'
    + '.lb-err__count{font-size:.8rem;opacity:.6;margin:14px 0 0}'
    + '@media (prefers-reduced-motion:reduce){.lb-err__spin{animation-duration:2.4s}}';
  var btns = K.home
    ? '<div class="lb-err__row"><a class="lb-err__btn" href="/">Back to home</a>'
      + '<button class="lb-err__btn lb-err__btn--ghost" onclick="location.reload()">Try again</button></div>'
    : '<div class="lb-err__row"><button class="lb-err__btn lb-err__btn--ghost" onclick="location.reload()">Try again</button></div>';
  var spin = K.retry ? '<div class="lb-err__spin" aria-hidden="true"></div>' : '';
  var count = K.retry ? '<p class="lb-err__count" id="__lbrc">Retrying…</p>' : '';
  var script = K.retry
    ? '<script>(function(){var s=' + Math.max(2, Math.min(8, Math.round((status === 429 ? 4 : 3)))) + ';'
      + 'var e=document.getElementById("__lbrc");'
      + 'function t(){if(!e)return;if(s<=0){location.reload();return}e.textContent="Retrying in "+s+"s…";s--;setTimeout(t,1000)}t();})();<\/script>'
    : '';
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<meta name="robots" content="noindex">'
    + '<title>' + esc(K.title) + '</title><style>' + css + '</style></head>'
    + '<body class="lb-err"><div class="lb-err__card" role="alert">'
    + spin
    + '<span class="lb-err__pill">' + esc(K.pill) + '</span>'
    + '<h1 class="lb-err__t">' + esc(K.title) + '</h1>'
    + '<p class="lb-err__d">' + esc(K.desc) + '</p>'
    + btns + count
    + '</div>' + script + '</body></html>';
}

var JAR={}, JAR_READY=null;
var DB='lightbase-edge-jar', STORE='kv';
function idb(){return new Promise(function(res){var rq=indexedDB.open(DB,1);
  rq.onupgradeneeded=function(){rq.result.createObjectStore(STORE)};
  rq.onsuccess=function(){res(rq.result)};rq.onerror=function(){res(null)}})}
function idbGet(k){return idb().then(function(db){if(!db)return null;
  return new Promise(function(res){var tx=db.transaction(STORE,'readonly');
    var r=tx.objectStore(STORE).get(k);r.onsuccess=function(){res(r.result||{})};r.onerror=function(){res({})}})})}
function idbSet(k,v){return idb().then(function(db){if(!db)return;
  var tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(v,k)})}
JAR_READY=idbGet('jar').then(function(j){JAR=j||{}});
self.addEventListener('install',function(e){self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(self.clients.claim())});
self.addEventListener('message',function(e){
  if(e.data&&e.data.type==='jar'){JAR=e.data.jar||{};idbSet('jar',JAR);}
});
function hdr(){return Object.keys(JAR).map(function(k){return k+'='+JAR[k]}).join('; ')}
function absorb(r){try{var c=r.headers.get('x-lb-set-cookie');if(!c)return;
  JSON.parse(c).forEach(function(sc){var kv=sc.split(';')[0];var i=kv.indexOf('=');
    if(i>0){var k=kv.slice(0,i).trim();if(/Expires=Thu, 01 Jan 1970|Max-Age=0/i.test(sc)){delete JAR[k]}else{JAR[k]=kv.slice(i+1).trim()}}});
  idbSet('jar',JAR);}catch(e){}}
function isAsset(url){
  var p=url.pathname;
  if(p==='/sw.js'||p==='/index.html'||p.indexOf('/_lb/')===0)return true;
  return (CFG.assetPrefixes||[]).some(function(pre){return p.indexOf(pre)===0});
}
// Build the preflight-free gateway request for an app request.
function toGateway(req, url){
  var method=req.method.toUpperCase();
  var m=url.searchParams; var tunnelMethod=null, tunnelCt=null;
  var bodyPromise=Promise.resolve(null);
  if(method!=='GET'&&method!=='HEAD'){
    var ct=(req.headers.get('content-type')||'').toLowerCase();
    var base=ct.split(';')[0].trim();
    if(base==='application/json'){ tunnelCt='application/json'; }
    else if(base==='multipart/form-data'){ tunnelCt=(req.headers.get('content-type')||'').trim(); }
    else if(base && base!=='text/plain' && base!=='application/x-www-form-urlencoded' && base!=='text/xml' && base!=='application/xml'){ tunnelCt=base; }
    if(method!=='POST'){ tunnelMethod=method; }
    // BismiLLAH (0.1.5 — retry-safe body): the buffered body is MEMOIZED on the
    // request so every retry attempt re-sends the SAME bytes. Request body
    // streams are single-consumption; a second arrayBuffer() call on a retry
    // would yield an empty buffer and silently corrupt POST bodies.
    if(!req.__lbBodyP){ req.__lbBodyP=req.arrayBuffer().then(function(b){return b}); }
    bodyPromise=req.__lbBodyP;
  }
  var q=new URLSearchParams(url.searchParams);
  var j=hdr(); if(j) q.set('__lbjar', j);
  if(tunnelMethod) q.set('__lbmethod', tunnelMethod);
  if(tunnelCt) q.set('__lbct', tunnelCt);
  var search=q.toString();
  var gurl=CFG.gateway+url.pathname+(search?'?'+search:'');
  return bodyPromise.then(function(body){
    // BismiLLAH (0.1.3 — redirect honesty): Chrome answers redirect:'manual'
    // with an OPAQUE-REDIRECT response (status 0, headers hidden) even for
    // navigate-mode SW fetches — so every app 302 (auth guards → /signin,
    // new users → /onboarding) crashed the worker with RangeError status 0
    // and surfaced as a bare ERR_FAILED page (live fleet catch). 'follow'
    // lets the gateway deliver the FINAL rendered response — the SW then
    // serves real HTML under the original URL, and auth redirects just work.
    // Cross-origin escapes (OAuth provider hand-off) are excluded upstream:
    // they navigate the top level directly, never through this tunnel.
    var init={method:(method==='GET'||method==='HEAD'||method==='POST')?method:'POST',redirect:'follow'};
    if(tunnelCt){init.headers={'content-type':'text/plain;charset=UTF-8'};}
    if(body&&body.byteLength){init.body=body;}
    return fetch(gurl,init);
  });
}
// Rewrite gateway-origin redirect Locations back to same-origin so the
// browser follows them through this worker (login flows keep working).
// BismiLLAH (0.1.3): with redirect:'follow' the gateway's redirects resolve
// INSIDE the tunnel; this path now only fires for the rare explicit 3xx
// that reaches the worker (kept as defense in depth).
function rewriteRedirect(r){
  var loc=r.headers.get('location');
  if(!loc) return null;
  try{
    var u=new URL(loc,CFG.gateway+'/');
    if(u.origin===new URL(CFG.gateway).origin){return u.pathname+u.search+u.hash;}
    return loc;
  }catch(e){return loc}
}
self.addEventListener('fetch',function(e){
  var req=e.request;var url=new URL(req.url);
  if(url.origin!==location.origin)return;       // cross-origin: browser handles
  if(isAsset(url))return;                        // static: Pages CDN (unmetered)
  e.respondWith((async function(){
    await JAR_READY;
    var r=null;
    // BismiLLAH (0.1.1): resilience — a network hiccup or a waking instance
    // answers a minimal self-reloading 503 instead of a hard network error.
    // BismiLLAH (async cold loads): a 429 load_in_progress means the app is
    // warming up (30s+ MemFS clone on small boxes) — retry with backoff while
    // the background load finishes; the shell shows its branded loader.
    try{ r=await toGateway(req,url); }catch(err){
      // BismiLLAH (0.1.2): the shared error experience — a calm self-reloading
      // card instead of a bare reconnecting line.
      return new Response(lbErrDoc(503,'network'),{status:503,headers:{'content-type':'text/html; charset=utf-8','retry-after':'3','cache-control':'no-store'}});
    }
    if(r&&(r.status===429)){
      // BismiLLAH (0.1.5 — universal warming retry): a 429 load_in_progress is
      // answered by the POOL GATE before the app ever sees the request, so
      // retrying is always safe (no double-execution). The old contract
      // retried navigations ONLY — every API fetch (login POST, JSON POST,
      // RSC flight request) got a raw 429 during a cold load and the page
      // silently stalled (live fleet battle-test catch: SchoolConnect login
      // POST 429 while the app reloaded). Now EVERY mode retries with
      // retry-after backoff (~30s window) while the MemFS load finishes;
      // non-navigations surface an honest 429 only if retries exhaust.
      for(var attempt=1;attempt<=8;attempt++){
        var ra=parseInt(r.headers.get('retry-after')||'4',10)||4;
        await new Promise(function(res){setTimeout(res,Math.min(ra,6)*1000)});
        try{ r=await toGateway(req,url); }catch(err){ break; }
        if(!r||r.status!==429) break;
      }
    }
    absorb(r);
    // BismiLLAH (0.1.2 — navigations never show raw JSON): when the gateway
    // answers a NAVIGATION with an error payload (429 saturated, 5xx, 504),
    // render the shared error experience with honest status + auto-recovery
    // instead of handing the browser a bare JSON document.
    if(req.mode==='navigate'&&(r.status===429||r.status>=500)){
      var ct='';try{ct=(r.headers.get('content-type')||'').toLowerCase()}catch(_e){}
      if(r.status===429||ct.indexOf('json')!==-1||ct.indexOf('text/plain')!==-1){
        return new Response(lbErrDoc(r.status,r.status===429?'warming':'hiccup'),{
          status:r.status,
          headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store',
                   'retry-after':(r.headers.get('retry-after')||'4')}});
      }
    }
    if(r.status>=300&&r.status<400){
      var loc=rewriteRedirect(r);
      if(loc){return new Response(null,{status:r.status,headers:{location:loc}})}
    }
    // BismiLLAH (0.1.3 — defense in depth): an opaque-redirect (status 0)
    // can never be handed back to the browser — answer the shared error card
    // instead of crashing the whole navigation.
    if(!r.status){
      return new Response(lbErrDoc(502,'hiccup'),{status:502,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
    }
    var resp=new Response(r.body,{status:r.status,statusText:r.statusText,headers:r.headers});
    resp.headers.delete('access-control-allow-origin');
    resp.headers.delete('access-control-expose-headers');
    resp.headers.delete('access-control-allow-credentials');
    resp.headers.delete('access-control-allow-headers');
    resp.headers.delete('vary');
    resp.headers.set('x-lb-served-by','sw');
    try{self.clients.matchAll().then(function(cs){cs.forEach(function(c){c.postMessage({type:'jar',jar:JAR})})})}catch(err){}
    return resp;
  })());
});

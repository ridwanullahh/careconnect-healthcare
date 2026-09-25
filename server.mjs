#!/usr/bin/env node
// بسم الله الرحمن الرحيم
// CareConnect — AppSail supervisor (full Node SSR-capable single origin).
//
// BismiLLAH (2026-09-23): CareConnect previously deployed as a static CF Pages
// SPA with a Pages Function bridge — Cloudflare edge is retired per the fleet
// mandate ("no edge functions, full Node environment"). On AppSail this
// supervisor:
//   1. binds $PORT instantly (gateway health),
//   2. serves the built SPA (dist/) with SPA fallback,
//   3. proxies /api/* to the Astro Node backend (apps/backend, standalone
//      @astrojs/node adapter) started as a child process on 127.0.0.1:4322,
//   4. streams the branded boot splash until the backend answers /api/health.
// No edge functions anywhere — everything is plain Node HTTP.
import http from 'node:http'
import { spawn } from 'node:child_process'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || 8080)
const HOST = process.env.HOST || '0.0.0.0'
const BACKEND_PORT = Number(process.env.BACKEND_PORT || 4322)
const DIST = path.join(__dirname, 'dist')
const BRAND = process.env.APP_SPLASH_NAME || 'CareConnect'

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.map': 'application/json', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json',
}

// ---- boot splash ----
const BOOT_START = Date.now()
const bootLines = []
let backendReady = false

// ---- start the Astro backend as a child process ----
const backendEntry = path.join(__dirname, 'apps', 'backend', 'dist', 'server', 'entry.mjs')
function startBackend() {
  if (!existsSync(backendEntry)) {
    bootLines.push('backend entry missing: apps/backend/dist/server/entry.mjs (build:backend not run?)')
    return
  }
  const child = spawn(process.execPath, [backendEntry], {
    env: { ...process.env, PORT: String(BACKEND_PORT), HOST: '127.0.0.1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const onLine = (buf) => String(buf).split('\n').filter(Boolean).forEach((l) => {
    bootLines.push(l.slice(0, 200))
    if (bootLines.length > 40) bootLines.shift()
  })
  child.stdout.on('data', onLine)
  child.stderr.on('data', onLine)
  child.on('exit', (code) => {
    backendReady = false
    bootLines.push(`backend exited (${code}) — restarting in 5s`)
    setTimeout(startBackend, 5000)
  })
}
startBackend()

function proxyToBackend(req, res) {
  const proxyReq = http.request(
    { host: '127.0.0.1', port: BACKEND_PORT, path: req.url, method: req.method, headers: { ...req.headers, host: `127.0.0.1:${BACKEND_PORT}` } },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers)
      proxyRes.pipe(res)
    },
  )
  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'API temporarily unavailable', detail: err.message }))
  })
  req.pipe(proxyReq)
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`)
  let filePath = path.join(DIST, decodeURIComponent(url.pathname))
  if (!filePath.startsWith(DIST)) { res.writeHead(403); return res.end('Forbidden') }
  // EISDIR guard (2026-09-26): a path that EXISTS but is a DIRECTORY (the boot
  // probe's `GET /` resolves to dist/ itself — or any "clean URL" like /docs/)
  // must fall back to index.html, NOT be read as a file. readFileSync on a
  // directory throws EISDIR and an uncaught throw here killed the whole
  // supervisor mid-boot-probe ("Process exited during boot probe (code 1)").
  let st = null
  try { st = statSync(filePath) } catch { st = null }
  if (!st || !st.isFile() || !filePath.startsWith(DIST)) {
    // SPA fallback — missing OR directory
    filePath = path.join(DIST, 'index.html')
  }
  let body
  try {
    body = readFileSync(filePath)
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' })
    return res.end(splashHtml(`Static serve error: ${err.code || err.message}`))
  }
  const ext = path.extname(filePath).toLowerCase()
  const isAsset = url.pathname.startsWith('/assets/')
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    ...(isAsset ? { 'Cache-Control': 'public, max-age=31536000, immutable' } : { 'Cache-Control': 'no-cache' }),
  })
  res.end(body)
}

function splashHtml(message) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="5"><title>${BRAND} — starting</title>
<style>body{font-family:system-ui,sans-serif;background:#f8fafc;color:#0f172a;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.c{text-align:center;padding:40px}.logo{font-size:40px;font-weight:800;background:linear-gradient(135deg,#0ea5e9,#6366f1);-webkit-background-clip:text;background-clip:text;color:transparent}
.pulse{width:12px;height:12px;border-radius:50%;background:#0ea5e9;margin:24px auto;animation:p 1.2s infinite}@keyframes p{0%,100%{opacity:.3}50%{opacity:1}}
.m{color:#475569;font-size:14px}pre{text-align:left;background:#e2e8f0;border-radius:8px;padding:12px;font-size:11px;max-width:640px;margin:20px auto 0;overflow:auto;max-height:180px}</style></head>
<body><div class="c"><div class="logo">${BRAND}</div><div class="pulse"></div><div class="m">${message || 'Preparing your secure healthcare platform…'} (${Math.round((Date.now() - BOOT_START) / 1000)}s)</div><pre>${bootLines.join('\n').replace(/</g, '&lt;')}</pre></div></body></html>`
}

// Supervisor resilience (2026-09-26): a single uncaught throw in a request
// handler used to kill the whole supervisor (EISDIR during the platform's
// boot probe = deploy failed). Handlers below are try/caught, and these
// last-resort guards keep the process alive no matter what — a supervisor
// must outlive its own bugs.
process.on('uncaughtException', (err) => {
  bootLines.push(`uncaughtException: ${err && err.stack ? err.stack.split('\n')[0] : err}`)
  console.error('[CareConnect] uncaughtException (supervisor kept alive):', err && err.message)
})
process.on('unhandledRejection', (err) => {
  bootLines.push(`unhandledRejection: ${err && err.message ? err.message : err}`)
  console.error('[CareConnect] unhandledRejection (supervisor kept alive):', err && err.message)
})

const server = http.createServer((req, res) => {
  try {
    handleRequest(req, res)
  } catch (err) {
    // Defensive net: handler bugs must serve an error page, never crash.
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' })
    try { res.end(splashHtml(`Request error: ${err && err.code ? err.code : err && err.message}`)) } catch { /* socket gone */ }
  }
})

function handleRequest(req, res) {
  if (req.url === '/__boot') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ app: BRAND, bootMs: Date.now() - BOOT_START, backendReady, lines: bootLines.slice(-8) }))
  }
  if (req.url.startsWith('/api/') && !backendReady) {
    // wait up to 20s for the backend before serving a splash
    const started = Date.now()
    const tryBackend = () => {
      const probe = http.get({ host: '127.0.0.1', port: BACKEND_PORT, path: '/api/health', timeout: 1000 }, (r) => {
        r.resume()
        backendReady = true
        proxyToBackend(req, res)
      })
      probe.on('error', () => {
        if (Date.now() - started > 20000) {
          res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(splashHtml('Warming up the API server…'))
          backendReady = false
        } else {
          setTimeout(tryBackend, 800)
        }
      })
    }
    return tryBackend()
  }
  if (req.url.startsWith('/api/')) {
    return proxyToBackend(req, res)
  }
  return serveStatic(req, res)
}

server.listen(PORT, HOST, () => {
  console.log(`[CareConnect] supervisor listening on ${HOST}:${PORT} (backend 127.0.0.1:${BACKEND_PORT}) — BismiLLAH`)
})

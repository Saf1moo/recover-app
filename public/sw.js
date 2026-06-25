const CACHE = 'recover-v2'
const ASSETS = ['/index.html']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ))
  self.clients.claim()
})

// Network-first for navigations (always get the freshest index.html → newest bundle).
// Stale-while-revalidate for hashed assets (immutable, safe to cache).
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  const isNav = e.request.mode === 'navigate'
  if (isNav) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put('/index.html', res.clone()))
        return res
      }).catch(() => caches.match('/index.html'))
    )
    return
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fresh = fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()))
        return res
      })
      return cached || fresh
    })
  )
})

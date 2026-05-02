const CACHE = 'ignia-v23-dragon-art';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './game.js',
  './manifest.json',
  './title.png',
  '../assets/heroes/mage.png',
  '../assets/heroes/archer.png',
  '../assets/heroes/merchant.png',
  '../assets/skills/ignia-fireball.png',
  '../assets/skills/ignia-flame-finger.png',
  '../assets/skills/ignia-flamethrower.png',
  '../assets/story/prologue-1-darkness.png',
  '../assets/story/prologue-3-cave.png',
  '../assets/bosses/dryad.png',
  '../assets/bosses/witch.png',
  '../assets/bosses/dragon-human.png',
  '../assets/scenes/spring.png',
  '../assets/scenes/chest.png',
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});

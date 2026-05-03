const CACHE = 'ignia-v45-bond-warn';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './game.js',
  './audio.js',
  './manifest.json',
  './title.png',
  '../assets/audio/title.mp3',
  '../assets/heroes/mage.png',
  '../assets/heroes/mage-wounded.png',
  '../assets/heroes/luna.png',
  '../assets/heroes/merchant.png',
  '../assets/skills/ignia-fireball.png',
  '../assets/skills/ignia-flame-finger.png',
  '../assets/skills/ignia-flamethrower.png',
  '../assets/skills/ignia-meteor.png',
  '../assets/skills/ignia-ignite.png',
  '../assets/story/prologue-1-darkness.png',
  '../assets/story/prologue-3-cave.png',
  '../assets/bosses/dryad.png',
  '../assets/bosses/witch.png',
  '../assets/bosses/dragon-human.png',
  '../assets/bosses/dragon-true.png',
  '../assets/scenes/spring.png',
  '../assets/scenes/chest.png',
  '../assets/scenes/merchant.png',
  '../assets/scenes/arina.png',
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

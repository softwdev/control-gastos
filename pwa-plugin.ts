import { createHash } from 'node:crypto'
import { readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import type { Plugin, ResolvedConfig } from 'vite'

/**
 * Plugin mínimo para convertir la app en PWA sin dependencias extra.
 * Al hacer `npm run build` genera `dist/sw.js` con la lista de todos los
 * archivos del build (JS, CSS, fuentes, íconos, manifest) para guardarlos
 * en caché y que la app funcione sin conexión.
 */
export function offlinePwa(options: { cachePrefix: string }): Plugin {
  let config: ResolvedConfig

  const listPublicFiles = (dir: string): string[] => {
    if (!dir) return []
    const out: string[] = []
    const walk = (current: string) => {
      for (const name of readdirSync(current)) {
        const full = join(current, name)
        if (statSync(full).isDirectory()) walk(full)
        else out.push(relative(dir, full).split(sep).join('/'))
      }
    }
    try {
      walk(dir)
    } catch {
      return []
    }
    return out
  }

  return {
    name: 'offline-pwa',
    apply: 'build',
    configResolved(resolved) {
      config = resolved
    },
    generateBundle(_options, bundle) {
      const hash = createHash('sha256')
      const files = new Set<string>(['index.html'])

      for (const [fileName, output] of Object.entries(bundle)) {
        if (fileName.endsWith('.map')) continue
        files.add(fileName)
        hash.update(fileName)
        hash.update(output.type === 'chunk' ? output.code : String(output.source.length))
      }
      for (const file of listPublicFiles(config.publicDir)) {
        files.add(file)
        hash.update(file)
      }

      const version = hash.digest('hex').slice(0, 10)
      const precache = [...files].sort().map((f) => `./${f}`)

      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: serviceWorkerSource(`${options.cachePrefix}-${version}`, options.cachePrefix, precache),
      })
    },
  }
}

function serviceWorkerSource(cacheName: string, prefix: string, precache: string[]): string {
  return `// Generado automáticamente en el build. No editar a mano.
const CACHE = ${JSON.stringify(cacheName)};
const PREFIX = ${JSON.stringify(prefix)};
const PRECACHE = ${JSON.stringify(precache, null, 2)};
const INDEX_URL = new URL('./index.html', self.location).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith(PREFIX) && key !== CACHE).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navegación: primero red (para recibir actualizaciones), si no hay conexión usa la copia guardada.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(INDEX_URL, copy));
          return response;
        })
        .catch(() => caches.match(INDEX_URL))
    );
    return;
  }

  // Archivos estáticos: primero caché, si no existe se descarga y se guarda.
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
`
}

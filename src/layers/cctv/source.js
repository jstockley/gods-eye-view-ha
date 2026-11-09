import {
  ACTIVE_FRAME_REFRESH_MS,
  FRAME_ENDPOINT,
  MEDIA_ENDPOINT,
} from './policy.js';
function safeNumber(value, fallback = NaN) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
// frameUrlFor/mediaUrlFor feed `<img>.src`/`<video>.src` directly (see
// src/layers/cctv/projection.js, frames.js, cards.js) rather than going
// through fetch(), so main.js's global fetch patch for Home Assistant
// Ingress's sub-path never sees them. A root-absolute src still resolves
// against the domain root, bypassing the Ingress prefix. Same fix,
// applied here instead: resolve relative to the page's actual URL.
// Harmless outside Ingress (plain localhost has no extra path prefix).
function resolveApiPath(path) {
  if (typeof document === 'undefined' || !path.startsWith('/') || path.startsWith('//')) {
    return path;
  }
  return new URL(path.slice(1), document.baseURI).toString();
}
function frameUrlFor(camera, refreshMs = ACTIVE_FRAME_REFRESH_MS) {
  const cadenceMs = Math.max(
    1000,
    safeNumber(refreshMs, ACTIVE_FRAME_REFRESH_MS),
  );
  const tick = Math.floor(Date.now() / cadenceMs);
  const params = new URLSearchParams({
    label: camera.name,
    city: camera.city,
    lat: camera.lat.toFixed(6),
    lon: camera.lon.toFixed(6),
    heading: String(Math.round(camera.headingDeg)),
    fov: String(Math.round(camera.fovDeg)),
    pitch: String(Math.round(camera.pitchDeg || -10)),
    ts: String(tick),
  });
  return resolveApiPath(
    `${FRAME_ENDPOINT}/${encodeURIComponent(camera.id)}?${params.toString()}`,
  );
}
function mediaUrlFor(camera) {
  return resolveApiPath(
    `${MEDIA_ENDPOINT}/${encodeURIComponent(camera.id)}?ts=${Math.floor(Date.now() / 15000)}`,
  );
}
/** Supply catalog/health records and the existing registered camera URL families. */
export function createCctvSource({
  fetchImpl = (...args) => globalThis.fetch(...args),
} = {}) {
  async function read(path, key, { signal } = {}) {
    signal?.throwIfAborted();
    const response = await fetchImpl(path, { cache: 'no-store', signal });
    if (!response.ok) throw new Error('Camera source HTTP ' + response.status);
    const payload = await response.json();
    signal?.throwIfAborted();
    if (!Array.isArray(payload?.[key]))
      throw new Error('Malformed camera ' + key + ' snapshot');
    return payload;
  }
  return {
    getCatalog(options) {
      return read('/api/cctv/sources', 'sources', options);
    },
    getHealth(options) {
      return read('/api/cctv/health', 'cameras', options);
    },
    getFrameUrl: frameUrlFor,
    getMediaUrl: mediaUrlFor,
  };
}

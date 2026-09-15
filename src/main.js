import { createStandaloneApplication } from './standalone/application.js';
import { describeError } from './standalone/errors.js';
// Home Assistant's Ingress serves this app under a per-install sub-path
// (e.g. /api/hassio_ingress/<token>/), but many fetch('/api/...') calls
// throughout the app use a leading slash, which browsers resolve against
// the domain root — bypassing that sub-path entirely and hitting Home
// Assistant's own server instead of this app's container. This patches
// fetch globally so any root-absolute request instead resolves relative
// to the page's actual URL (document.baseURI), which already includes
// the correct Ingress prefix. Harmless outside Ingress (plain localhost
// has no extra path prefix, so the rewrite is a no-op there).
const _nativeFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  if (typeof input === 'string' && input.startsWith('/') && !input.startsWith('//')) {
    input = new URL(input.slice(1), document.baseURI).toString();
  }
  return _nativeFetch(input, init);
};
const application = createStandaloneApplication({
  googleApiKey: import.meta.env.GOOGLE_MAPS_API_KEY,
  cesiumToken: import.meta.env.CESIUM_ION_TOKEN,
  allowQaRegistration: import.meta.env.DEV,
});

application.start().catch((error) => {
  console.error("God's Eye View initialization failed:", error);
  const loaderStatus = document.querySelector('#loading-screen .loader-status');
  loaderStatus.textContent = `Error: ${describeError(error)}`;
  loaderStatus.style.color = '#ff4444';
});

export { application };

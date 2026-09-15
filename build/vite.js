import { applicationHtmlPlugin } from './application-html.js';
import cesium from 'vite-plugin-cesium';

/** Build browser assets with explicit inputs; never load environment or providers. */
export function createBrowserViteConfig({
  plugins = [],
  publicDir,
  googleApiKey,
  cesiumToken,
  host = 'localhost',
  port = 4173,
} = {}) {
  const shared = host === '0.0.0.0' || host === '::';

  return {
    base: './',
    plugins: [cesium(), applicationHtmlPlugin(), ...plugins],
    ...(publicDir === undefined ? {} : { publicDir }),
    server: {
      host: host || 'localhost',
      port: parseInt(port, 10) || 4173,
      allowedHosts: shared ? true : ['localhost', '127.0.0.1', '.local'],
      fs: {
        deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/ENVIRONMENT'],
      },
      // These headers protect the document containing Provider Settings —
      // but that panel is already disabled whenever the server is shared
      // (see server/standalone/key-setup), and Home Assistant's Ingress
      // requires embedding this app in an iframe on its own origin, which
      // these headers otherwise unconditionally block. Only apply them in
      // the non-shared, localhost-only case where they're still needed.
      ...(shared
        ? {}
        : {
            headers: {
              'X-Frame-Options': 'DENY',
              'Content-Security-Policy': "frame-ancestors 'none'",
            },
          }),
    },
    define: {
      'import.meta.env.GOOGLE_MAPS_API_KEY': JSON.stringify(googleApiKey),
      'import.meta.env.CESIUM_ION_TOKEN': JSON.stringify(cesiumToken),
    },
    build: { chunkSizeWarningLimit: 1500 },
  };
}
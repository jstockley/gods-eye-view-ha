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
  defaultLat,
  defaultLon,
  defaultZoomM,
} = {}) {
  const shared = host === '0.0.0.0' || host === '::';
  const securityHeaders = shared
    ? {}
    : {
        headers: {
          'X-Frame-Options': 'DENY',
          'Content-Security-Policy': "frame-ancestors 'none'",
        },
      };

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
      ...securityHeaders,
    },
    // vite preview resolves its own host/port/allowedHosts/headers from this
    // `preview` section rather than always inheriting `server` — mirrored
    // explicitly here so Ingress (shared, 0.0.0.0) behaves the same under
    // `npm run preview` as it does under `npm run dev`.
    preview: {
      host: host || 'localhost',
      port: parseInt(port, 10) || 4173,
      allowedHosts: shared ? true : ['localhost', '127.0.0.1', '.local'],
      ...securityHeaders,
    },
    define: {
      'import.meta.env.GOOGLE_MAPS_API_KEY': JSON.stringify(googleApiKey),
      'import.meta.env.CESIUM_ION_TOKEN': JSON.stringify(cesiumToken),
      'import.meta.env.DEFAULT_LAT': JSON.stringify(defaultLat),
      'import.meta.env.DEFAULT_LON': JSON.stringify(defaultLon),
      'import.meta.env.DEFAULT_ZOOM_M': JSON.stringify(defaultZoomM),
    },
    build: { chunkSizeWarningLimit: 1500 },
  };
}
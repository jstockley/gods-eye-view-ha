# God's Eye View — Home Assistant Add-on

Unofficial Home Assistant add-on wrapping [gods-eye-view-ha](https://github.com/jstockley/gods-eye-view-ha),
a fork of [God's Eye View](https://github.com/bilawalsidhu/gods-eye-view) —
a live 3D spatial intelligence globe (aircraft, ships, satellites, CCTV, and more).
Upstream and this fork are MIT licensed.

## Repo layout

This add-on packaging lives directly at the repo root, alongside the app
source — `gods_eye_view/` is the add-on folder Home Assistant's Supervisor
discovers (it scans the top level of the repo for folders containing
`config.yaml`).

The Dockerfile clones the app source from this same repo at build time
(`git clone`), rather than copying local files — Supervisor builds each
add-on using only that add-on's own folder as the build context, not the
whole repo, so the app source has to be fetched rather than referenced
directly.

## What this add-on changes vs. running the app directly

Running God's Eye View behind Home Assistant's Ingress (a per-install,
dynamic URL sub-path, embedded in an iframe in the HA sidebar) surfaced a
few things the upstream app wasn't built around. Fixes applied in this fork,
all gated so they only change behaviour when the server is "shared"
(`HOST=0.0.0.0`), never for a normal local `npm run dev`:

- **`src/main.js`** — patches `fetch` globally so a root-absolute request
  (`fetch('/api/...')`) resolves relative to the page's actual URL
  (`document.baseURI`) instead of the domain root. Dozens of call sites
  across the app use literal `/api/...` paths, which bypass Ingress's
  sub-path entirely without this.
- **`build/vite.js`** — `base: './'` so built asset URLs are relative, not
  root-absolute; a matching `preview` block (Vite resolves `preview`
  options separately from `server` options) so `allowedHosts` and the
  frame-blocking security headers behave the same under `vite preview` as
  under `vite dev`.
- **`server/providers/local.js`** — `withPreviewSupport` wraps every
  provider plugin, mirroring `configureServer` onto `configurePreviewServer`
  for any plugin that only implemented the former. Several provider
  endpoints (Overpass, adsb.lol, others) otherwise 404 under `vite preview`.
- **Production build, not dev server** — the add-on runs `npm run build`
  then `npm run preview`, not `npm run dev`. Vite's dev server doesn't
  reliably rebase served asset URLs for an arbitrary sub-path; a real
  production build does. A build has to run at least once, because
  `GOOGLE_MAPS_API_KEY` / `CESIUM_ION_TOKEN` are baked in via Vite's
  `define` at build time, and the real values only exist once the add-on's
  `.env` has been written from Home Assistant's options.
- **Build caching across restarts** — rebuilding on every single container
  start/restart is heavy on low-spec hardware (a Raspberry Pi can genuinely
  OOM partway through a bundle, causing a crash-restart loop that looks
  like everything going slow and provider requests failing). The run
  script hashes the generated `.env` together with the cloned app commit
  (`/app/.gev-commit`, written at image build time) and skips `npm run
  build` whenever neither has changed since the last successful build,
  reusing the previous `dist/` instead. Both the hash and the built
  `dist/` live on the same persistent `addon_config` volume as `.env`, so
  they survive restarts; a genuine key change or an add-on update (new
  app code → new commit SHA) still forces a rebuild.
- **`HOST`/`PORT` as real environment variables**, not `vite --host/--port`
  CLI flags — the app's own `shared`-mode detection
  (`server/standalone/vite.config.js`) reads `process.env.HOST`, which CLI
  flags never set.

## Default startup view

Upstream always flies the camera to Austin, TX on load (`flyToAustin` in
`src/camera.js`). This fork adds, in priority order:

1. **A saved view**, if the home-pin button in the top-center action bar has
   ever been clicked — saves the current camera position to the browser's
   `localStorage`. Per-browser, not per-add-on-install: a different device
   or a cleared browser resets to the next fallback.
2. **A geocoded postcode**, if `default_postcode` is set in the add-on's
   options — requires the **Geocoding API** enabled on the same Google
   Cloud project as `google_maps_api_key` (separate from Map Tiles and
   Places). If geocoding fails, falls through to:
3. **Austin, TX** — the original upstream default.

## Installation

1. In Home Assistant: **Settings → Add-ons → Add-on Store → ⋮ → Repositories**
2. Add this repository's URL: `https://github.com/jstockley/gods-eye-view-ha`
3. Refresh the store, find **God's Eye View** under the new repository
   section, and install
4. Open the add-on's **Configuration** tab and fill in whichever API keys
   you want (see table below)
5. Start the add-on and open it from the Home Assistant sidebar (Ingress —
   no port setup needed)

Keys are written to a `.env` file from your add-on options before the app
starts, not entered through the app's own in-browser panel — that panel is
disabled whenever the app is network-accessible rather than localhost-only,
which is the case here.

## Configuration

All keys are optional except you'll want at least one 3D map source
(`google_maps_api_key` or `cesium_ion_token`) for the photorealistic globe —
everything else unlocks additional live data layers. See the
[upstream README's key table](https://github.com/jstockley/gods-eye-view-ha#-api-keys)
for what each one does and where to get it.

| Option | Purpose |
|---|---|
| `google_maps_api_key` | Google Photorealistic 3D + place search (metered). Needs **Map Tiles API** enabled; **Places API (New)** for the nearby-places feature; **Geocoding API** if using `default_postcode`. |
| `cesium_ion_token` | Google Photorealistic 3D + terrain via Cesium ion (free tier, non-commercial). |
| `openai_api_key` | Voice control + AI HUD summary (metered). |
| `aisstream_api_key` | Live vessels. |
| `firms_map_key` | Live active fires. |
| `tomtom_api_key` | Live traffic flow/congestion. |
| `opensky_auth_mode` | `anon` works without an account; set up OAuth separately for higher polling limits. |
| `ratelimit_openai_per_min` / `ratelimit_google_per_min` | Per-IP throttles — not a substitute for provider-side billing alerts. |
| `default_postcode` | Optional fallback default camera location (see above). Requires Geocoding API. |
| `default_zoom_m` | Altitude in metres for the postcode fallback's final camera position (default 600). |
| `log_level` | `info` (default) or `debug` — `debug` sets `DEBUG=vite:*` for verbose Vite logging in the add-on Log tab. Noisy; switch back to `info` once you've found what you needed. |

## Local build/test

Build using the add-on folder itself as context, matching how Supervisor
actually builds it:

```
docker build -t gods-eye-view-addon -f gods_eye_view/Dockerfile gods_eye_view --build-arg BUILD_FROM=ghcr.io/home-assistant/amd64-base-debian:bookworm
docker run -p 8099:8099 gods-eye-view-addon
```

Note this bare `docker run` won't have any keys configured (the
`cont-init.d` script that writes `.env` only runs inside HA's Supervisor) —
that's expected, not a bug, when just checking the app itself boots.

## Known issues / outstanding items

- [ ] Docker's build cache doesn't know when the upstream GitHub branch has
      moved — the Dockerfile fetches the GitHub commits API as a
      cache-busting step, but every real change still needs a `version`
      bump in `config.yaml` to force Supervisor to treat it as a fresh
      install worth rebuilding.
- [ ] `vite:*` debug logging has not been exhaustively tested for leaking
      secrets into the Log tab — treat `debug` as a diagnostic, not
      something to leave on.
- [ ] Not tested on `aarch64`/`armv7` — only `amd64` has been built and run
      end-to-end so far.
- [ ] If a build ever fails (e.g. the device ran out of memory mid-build),
      the run script deliberately exits rather than serving a stale/
      missing `dist/` — check the Log tab for a fatal "Production build
      failed" line and restart the add-on once whatever caused the
      failure (usually memory pressure) has cleared.
- [ ] Home Assistant's own Supervisor occasionally needs updating before
      add-on updates will apply at all (`'AppManager.update' blocked from
      execution, supervisor needs to be updated first`) — unrelated to this
      repo, but worth checking Settings → System → Updates if an update
      silently fails.

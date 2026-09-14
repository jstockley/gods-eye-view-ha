# God's Eye View — Home Assistant Add-on

Unofficial Home Assistant add-on wrapping [gods-eye-view-ha](https://github.com/jstockley/gods-eye-view-ha),
a fork of [God's Eye View](https://github.com/bilawalsidhu/gods-eye-view) —
a live 3D spatial intelligence globe (aircraft, ships, satellites, CCTV, and more).
Upstream is MIT licensed.

## Repo layout

This add-on packaging lives inside the app repo itself, under `addon/gods_eye_view/`,
so the Dockerfile can `COPY` the app source directly rather than cloning it
separately. Put a `.dockerignore` at the **repo root** (not inside `addon/`)
excluding `addon/`, `.git`, and `node_modules`.

## Local build/test

```
docker build -t gods-eye-view-addon -f addon/gods_eye_view/Dockerfile .
docker run -p 8099:8099 gods-eye-view-addon
```

Note the build context is `.` (repo root), not `addon/gods_eye_view` — the
Dockerfile needs the actual app source alongside it.

## Installation

1. In Home Assistant, go to **Settings → Add-ons → Add-on Store → ⋮ → Repositories**.
2. Add this repository's URL.
3. Find "God's Eye View" in the store and install it.
4. Open it from the sidebar (Ingress) — no port setup needed.

## Configuration

All keys are optional except you'll want at least one 3D map source
(`google_maps_api_key` or `cesium_ion_token`) for the photorealistic globe —
everything else unlocks additional live data layers. See the [upstream
README's key table](https://github.com/jstockley/gods-eye-view-ha#-api-keys)
for what each one does and where to get it.

| Option | Purpose |
|---|---|
| `google_maps_api_key` | Direct Google Photorealistic 3D + place search (metered). |
| `cesium_ion_token` | Google Photorealistic 3D + terrain via Cesium ion (free tier, non-commercial). |
| `openai_api_key` | Voice control + AI HUD summary (metered). |
| `aisstream_api_key` | Live vessels. |
| `firms_map_key` | Live active fires. |
| `tomtom_api_key` | Live traffic flow/congestion. |
| `opensky_auth_mode` | `anon` works without an account; set up OAuth separately for higher polling limits. |
| `ratelimit_openai_per_min` / `ratelimit_google_per_min` | Per-IP throttles — not a substitute for provider-side billing alerts. |

Keys are written to a `.env` file before the app starts (not entered through
the app's own in-browser panel — that panel is disabled whenever the app is
network-accessible rather than localhost-only, which is the case here).

## Status

Untested — built from reading the upstream README, package.json, and repo
structure, not from a running container. Before relying on this:

- [ ] Verify the Vite dev server / CesiumJS assets resolve correctly under
      Home Assistant's Ingress sub-path rewriting (check `vite.config.js`
      for a `base` setting).
- [ ] Confirm `npm run dev -- --host 0.0.0.0 --port 8099` is the right
      production invocation (vs. `build` + `preview`) — the dev server is
      the only path confirmed in the README to include the key-broker
      middleware.
- [ ] Pin a specific commit/tag rather than tracking `main`.
- [ ] Decide whether to expose the rate-limit / OpenSky-OAuth advanced
      options, or keep the schema minimal.

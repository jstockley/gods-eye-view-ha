#!/usr/bin/with-contenv bashio
# ------------------------------------------------------------------------
# Writes /app/.env from the add-on's options before the app starts.
# This is required, not optional: the app disables its own in-browser
# key-entry panel ("POWER UP") whenever it's bound for network access
# rather than localhost-only — which is exactly the case running inside
# this container behind Ingress. So keys have to be provisioned here.
#
# The generated .env lives on the persistent addon_config volume so it
# survives add-on restarts/updates, and is symlinked into /app/.env.
# ------------------------------------------------------------------------

ENV_STORE="/config/addons_config/gods_eye_view/.env"
mkdir -p "$(dirname "${ENV_STORE}")"

{
  echo "GOOGLE_MAPS_API_KEY=$(bashio::config 'google_maps_api_key')"
  echo "CESIUM_ION_TOKEN=$(bashio::config 'cesium_ion_token')"
  echo "OPENAI_API_KEY=$(bashio::config 'openai_api_key')"
  echo "AISSTREAM_API_KEY=$(bashio::config 'aisstream_api_key')"
  echo "FIRMS_MAP_KEY=$(bashio::config 'firms_map_key')"
  echo "TOMTOM_API_KEY=$(bashio::config 'tomtom_api_key')"
  echo "OPENSKY_AUTH_MODE=$(bashio::config 'opensky_auth_mode')"
  echo "GEV_RATELIMIT_OPENAI_PER_MIN=$(bashio::config 'ratelimit_openai_per_min')"
  echo "GEV_RATELIMIT_GOOGLE_PER_MIN=$(bashio::config 'ratelimit_google_per_min')"
} > "${ENV_STORE}"

chmod 600 "${ENV_STORE}"
ln -sf "${ENV_STORE}" /app/.env

bashio::log.info "Wrote /app/.env from add-on options."

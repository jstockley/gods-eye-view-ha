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

GOOGLE_KEY=$(bashio::config 'google_maps_api_key')
POSTCODE=$(bashio::config 'default_postcode')
DEFAULT_ZOOM_M=$(bashio::config 'default_zoom_m')

DEFAULT_LAT=""
DEFAULT_LON=""
if [ -n "${POSTCODE}" ] && [ -n "${GOOGLE_KEY}" ]; then
  ENCODED=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "${POSTCODE}")
  RESULT=$(curl -s "https://maps.googleapis.com/maps/api/geocode/json?address=${ENCODED}&key=${GOOGLE_KEY}")
  LATLON=$(echo "${RESULT}" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    loc = d['results'][0]['geometry']['location']
    print(f\"{loc['lat']} {loc['lng']}\")
except Exception:
    pass
")
  if [ -n "${LATLON}" ]; then
    DEFAULT_LAT=$(echo "${LATLON}" | cut -d' ' -f1)
    DEFAULT_LON=$(echo "${LATLON}" | cut -d' ' -f2)
    bashio::log.info "Geocoded postcode '${POSTCODE}' to ${DEFAULT_LAT}, ${DEFAULT_LON}"
  else
    bashio::log.warning "Could not geocode postcode '${POSTCODE}' — using the app's built-in default location instead."
  fi
fi

{
  echo "GOOGLE_MAPS_API_KEY=${GOOGLE_KEY}"
  echo "CESIUM_ION_TOKEN=$(bashio::config 'cesium_ion_token')"
  echo "OPENAI_API_KEY=$(bashio::config 'openai_api_key')"
  echo "AISSTREAM_API_KEY=$(bashio::config 'aisstream_api_key')"
  echo "FIRMS_MAP_KEY=$(bashio::config 'firms_map_key')"
  echo "TOMTOM_API_KEY=$(bashio::config 'tomtom_api_key')"
  echo "OPENSKY_AUTH_MODE=$(bashio::config 'opensky_auth_mode')"
  echo "GEV_RATELIMIT_OPENAI_PER_MIN=$(bashio::config 'ratelimit_openai_per_min')"
  echo "GEV_RATELIMIT_GOOGLE_PER_MIN=$(bashio::config 'ratelimit_google_per_min')"
  echo "DEFAULT_LAT=${DEFAULT_LAT}"
  echo "DEFAULT_LON=${DEFAULT_LON}"
  echo "DEFAULT_ZOOM_M=${DEFAULT_ZOOM_M}"
} > "${ENV_STORE}"

chmod 600 "${ENV_STORE}"
ln -sf "${ENV_STORE}" /app/.env

bashio::log.info "Wrote /app/.env from add-on options."
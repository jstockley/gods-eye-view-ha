# syntax=docker/dockerfile:1
ARG BUILD_FROM
FROM $BUILD_FROM

# Upstream requires Node >=24.14.0 <25 or >=26 <27 — 25.x is explicitly
# excluded (EOL). Alpine's apk repos don't carry Node 24 yet, so this uses
# the Debian-based HA build image (see build.yaml) and installs Node via
# NodeSource, which tracks exact major versions.
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl ca-certificates gnupg git \
    && curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Home Assistant's Supervisor builds each add-on using ONLY that add-on's
# own folder as the build context (not the whole repo) — confirmed via
# the official builder's --target flag and how community add-ons are
# built. So the app source has to be fetched here, rather than COPY'd
# from alongside this Dockerfile like the local-test version did.
#
# Docker's build cache only checks whether this RUN instruction's TEXT
# changed, not whether the remote branch has new commits — so without
# this ADD line, pushing new commits to main would silently reuse a
# stale cached checkout forever. Fetching the commit API's response
# forces Docker to re-run the clone whenever the branch actually moves.
#
# TODO: pin a specific tag/commit once you've cut a release, instead of
# tracking main — a moving branch means the add-on could change under
# installed users without a version bump.
ARG GEV_REF=main
ADD https://api.github.com/repos/jstockley/gods-eye-view-ha/commits/${GEV_REF} /tmp/gev-cache-bust.json
RUN git clone --depth 1 --branch ${GEV_REF} \
    https://github.com/jstockley/gods-eye-view-ha.git .

RUN npm ci

# NOTE: intentionally NOT running `npm run build` + `vite preview`.
# The documented, tested path is the dev server itself
# (`npm run dev -- --host 0.0.0.0 --port <port>`), which is also what
# brokers all provider keys server-side via the integrated Vite plugin.

COPY rootfs /

RUN chmod a+x /etc/services.d/gods_eye_view/run \
    && chmod a+x /etc/cont-init.d/*.sh

EXPOSE 8099

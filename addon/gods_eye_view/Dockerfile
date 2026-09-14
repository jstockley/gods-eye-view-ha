# syntax=docker/dockerfile:1
ARG BUILD_FROM
FROM $BUILD_FROM

# Upstream requires Node >=24.14.0 <25 or >=26 <27 — 25.x is explicitly
# excluded (EOL). Alpine's apk repos don't carry Node 24 yet, so this uses
# the Debian-based HA build image (see build.yaml) and installs Node via
# NodeSource, which tracks exact major versions.
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl ca-certificates gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Build context is the repo root (see the docker build command in
# README.md) — this copies the actual app source living alongside this
# add-on folder, rather than re-cloning it from GitHub.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# NOTE: intentionally NOT running `npm run build` + `vite preview`.
# The documented, tested path is the dev server itself
# (`npm run dev -- --host 0.0.0.0 --port <port>`), which is also what
# brokers all provider keys server-side via the integrated Vite plugin.
# `vite preview` may not mount that same middleware — untested, don't
# switch to it without checking build/vite.js.

COPY addon/gods_eye_view/rootfs /

RUN chmod a+x /etc/services.d/gods_eye_view/run \
    && chmod a+x /etc/cont-init.d/*.sh

EXPOSE 8099

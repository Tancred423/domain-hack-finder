# syntax=docker/dockerfile:1.7

ARG NODE_IMAGE=node:22-bookworm-slim
ARG DENO_VERSION=1.46.3

FROM ${NODE_IMAGE} AS base
ARG DENO_VERSION
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl unzip ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh -s v${DENO_VERSION} \
  && ln -sf /usr/local/bin/deno /usr/bin/deno
WORKDIR /workspace

FROM base AS frontend-build
WORKDIR /workspace/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

FROM base AS dev
WORKDIR /workspace
CMD ["sleep", "infinity"]

FROM base AS runtime
WORKDIR /app
COPY deno.json ./
COPY tld-list.json ./
COPY backend ./backend
COPY --from=frontend-build /workspace/frontend/dist ./frontend/dist
ENV PORT=8080
EXPOSE 8080
CMD ["deno", "task", "start"]


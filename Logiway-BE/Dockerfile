FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=6767

RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 python3-venv wget && \
    python3 -m venv /opt/venv && \
    /opt/venv/bin/pip install --no-cache-dir torch transformers --index-url https://download.pytorch.org/whl/cpu && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
USER node
EXPOSE 6767
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD wget -q -O - "http://127.0.0.1:${PORT}/health" > /dev/null || exit 1
CMD ["node", "dist/main.js"]

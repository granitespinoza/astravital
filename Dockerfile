# AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
# Local container profile; cloud persistence and voice artifacts are separate setup.
FROM node:26-bookworm-slim

RUN apt-get update  && apt-get install -y --no-install-recommends ca-certificates ffmpeg git cmake build-essential  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci
COPY --chown=node:node . .
RUN npm run build && npm prune --omit=dev
RUN mkdir -p /data /app/.runtime  && chown -R node:node /data /app/.runtime

ENV NODE_ENV=production HOST=0.0.0.0 PORT=4173 DB_PATH=/data/demo.sqlite SEED=142
USER node
EXPOSE 4173
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["npm", "run", "demo"]

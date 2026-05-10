FROM oven/bun:1.3.11-slim

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts

COPY . .

ENV NODE_ENV=production

USER bun

STOPSIGNAL SIGTERM

CMD ["bun", "start"]

# Multi-stage build for the monorepo. `base` installs workspace deps; per-app stages
# select what to run. Build a specific stage with `docker build --target bot .`
# (compose picks the target per service).
FROM oven/bun:1.3.11-slim AS base

WORKDIR /app

# Copy manifests first so `bun install` is cached independently of source changes.
COPY package.json bun.lock tsconfig.base.json ./
COPY apps/bot/package.json ./apps/bot/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY packages/scheduler/package.json ./packages/scheduler/

RUN bun install --frozen-lockfile --ignore-scripts

COPY . .

# The workspace scripts use `bun --env-file=../../.env`; in containers the env comes
# from the runtime (compose `environment:`). An empty .env satisfies the flag while
# process.env is used. (postinstall is skipped via --ignore-scripts, so no .env exists.)
RUN touch .env

ENV NODE_ENV=production
USER bun
STOPSIGNAL SIGTERM

# Bot runtime.
FROM base AS bot
CMD ["bun", "--filter", "@repo/bot", "start"]

# One-off tools (DB migration; `bun register` is invoked via compose command override).
FROM base AS tools
CMD ["bun", "--filter", "@repo/db", "migrate"]

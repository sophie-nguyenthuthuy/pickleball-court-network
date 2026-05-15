# syntax=docker/dockerfile:1.7
FROM node:26-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @pcn/admin... build

FROM node:26-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
COPY --from=build /app /app
WORKDIR /app/apps/admin
EXPOSE 3001
USER node
CMD ["pnpm", "start"]

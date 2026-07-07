FROM node:20-alpine AS deps

WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && pnpm install --no-frozen-lockfile --ignore-scripts

FROM node:20-alpine AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . ./

# Defaults mirror docker-compose.yml's ${VAR:-default} values so a bare
# `docker build` (no --build-arg, no compose) still produces a working
# production image instead of silently falling back to the localhost
# values in frontend/.env.
ARG NEXT_PUBLIC_APP_URL=https://crm.stechnotools.com
ARG NEXT_PUBLIC_API_URL=https://crm.stechnotools.com/api
ARG API_URL=http://nginx/api
ARG NEXTAUTH_URL=https://crm.stechnotools.com
ARG NEXTAUTH_SECRET=jewellery-scheme-nextauth-secret
ARG NEXTAUTH_BASEPATH=/api/auth
ARG BASEPATH=
ARG NEXT_PUBLIC_DOCS_URL=https://demos.pixinvent.com/materialize-nextjs-admin-template/documentation
ARG MAPBOX_ACCESS_TOKEN=
ARG NEXTAUTH_TRUST_HOST=true

ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV API_URL=$API_URL
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET
ENV NEXTAUTH_BASEPATH=$NEXTAUTH_BASEPATH
ENV BASEPATH=$BASEPATH
ENV NEXT_PUBLIC_DOCS_URL=$NEXT_PUBLIC_DOCS_URL
ENV MAPBOX_ACCESS_TOKEN=$MAPBOX_ACCESS_TOKEN
ENV NEXTAUTH_TRUST_HOST=$NEXTAUTH_TRUST_HOST

RUN corepack enable \
    && pnpm exec prisma generate \
    && pnpm run build:icons \
    && pnpm build

FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]

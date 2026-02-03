# Build stage
FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/protocol/package.json ./packages/protocol/
COPY packages/database/package.json ./packages/database/
COPY packages/redis/package.json ./packages/redis/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/config/package.json ./packages/config/
COPY apps/login-server/package.json ./apps/login-server/
COPY apps/connection-server/package.json ./apps/connection-server/
COPY tools/data-importer/package.json ./tools/data-importer/

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Copy source files
COPY tsconfig.json turbo.json ./
COPY packages/ ./packages/
COPY apps/ ./apps/
COPY tools/ ./tools/

# Build all packages
RUN pnpm build

# Production stage - Login Server
FROM node:22-alpine AS login-server

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/*/package.json ./packages/
COPY --from=builder /app/packages/*/dist ./packages/
COPY --from=builder /app/apps/login-server/package.json ./apps/login-server/
COPY --from=builder /app/apps/login-server/dist ./apps/login-server/dist

EXPOSE 44453/udp

CMD ["node", "apps/login-server/dist/index.js"]

# Production stage - Connection Server
FROM node:22-alpine AS connection-server

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/*/package.json ./packages/
COPY --from=builder /app/packages/*/dist ./packages/
COPY --from=builder /app/apps/connection-server/package.json ./apps/connection-server/
COPY --from=builder /app/apps/connection-server/dist ./apps/connection-server/dist

EXPOSE 44455/udp

CMD ["node", "apps/connection-server/dist/index.js"]

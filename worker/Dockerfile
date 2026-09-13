# ==============================================================================
# CodeSync AI Worker - Production Multi-Stage Dockerfile
# BullMQ Background Job & Execution Worker
# ==============================================================================

FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci

COPY src/ ./src/

RUN npm run build

FROM node:20-alpine AS runner

ENV NODE_ENV=production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

USER node

CMD ["node", "dist/index.js"]

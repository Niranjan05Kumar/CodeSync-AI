# ==============================================================================
# CodeSync AI Backend Server - Production Multi-Stage Dockerfile
# Node.js 20 on Alpine Linux (Minimal Attack Surface & Resource Footprint)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Builder
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install build essentials if native dependencies require compilation
RUN apk add --no-cache python3 make g++

# Copy package manifests first to leverage Docker layer caching
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including devDependencies required for compilation)
RUN npm ci

# Copy server source code
COPY src/ ./src/

# Compile TypeScript into optimized JavaScript in dist/
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Runner
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

# Set production environment flags
ENV NODE_ENV=production
ENV PORT=5000

WORKDIR /app

# Add curl for container orchestration health checks
RUN apk add --no-cache curl

# Copy package manifests and install production-only dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled artifacts from builder stage
COPY --from=builder /app/dist ./dist

# Create non-root user and set permissions for security
USER node

# Expose HTTP and WebSocket port
EXPOSE 5000

# Container Healthcheck targeting CodeSync health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/api/v1/health || exit 1

# Start the CodeSync Express & Socket.IO server
CMD ["node", "dist/index.js"]

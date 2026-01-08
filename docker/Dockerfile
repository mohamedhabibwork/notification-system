# Multi-stage Dockerfile for Notification Service

# Base stage - dependencies only
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Build stage - compile TypeScript
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage - main service
FROM node:18-alpine AS production
WORKDIR /app

# Copy dependencies from base
COPY --from=base /app/node_modules ./node_modules

# Copy compiled code from build
COPY --from=build /app/dist ./dist
COPY --from=build /app/proto ./proto

# Copy necessary files
COPY package*.json ./
COPY tsconfig.json ./

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV GRPC_PORT=50051
ENV GRAPHQL_PORT=4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Expose ports
EXPOSE 3000 50051 4000

# Start application
CMD ["node", "dist/src/main"]

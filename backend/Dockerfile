# Multi-stage build for production

# Stage 1: Build
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Force development mode to install devDependencies (tsc, etc.)
ENV NODE_ENV=development

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN ./node_modules/.bin/tsc

# Build seed for production
RUN ./node_modules/.bin/tsc --project tsconfig.seed.json

# Stage 2: Production
FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only
RUN npm install --omit=dev

# Generate Prisma client in production stage
RUN npx prisma generate

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-seed ./dist-seed
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create logs directory
RUN mkdir -p logs

# Memory limit for 4GB server
ENV NODE_OPTIONS="--max-old-space-size=512"

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Copy entrypoint
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Run migrations and start server
CMD ["./entrypoint.sh"]

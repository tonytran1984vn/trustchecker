FROM node:22-alpine AS base

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY server/ ./server/
COPY client/ ./client/
COPY prisma/ ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

# Entrypoint: migrate, seed if needed, then start
CMD ["sh", "-c", "npx prisma migrate deploy 2>/dev/null; node server/seed.js 2>/dev/null; node server/index.js"]

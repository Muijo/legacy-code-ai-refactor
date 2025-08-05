# Multi-stage build for production deployment
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY test-files/ ./test-files/

# Create uploads directory
RUN mkdir -p uploads

FROM node:18-alpine AS production

# Install system dependencies for monitoring
RUN apk add --no-cache curl

WORKDIR /app

# Copy built application
COPY --from=builder /app .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S refactor -u 1001 -G nodejs

# Set ownership
RUN chown -R refactor:nodejs /app
USER refactor

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
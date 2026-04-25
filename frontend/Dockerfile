# Use Bun image as base
FROM oven/bun:1 AS builder

# Set working directory
WORKDIR /app

# Copy VERSION file
COPY ../VERSION ./VERSION

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source files
COPY . .

# Copy VERSION to static folder for runtime access
RUN cp VERSION static/VERSION 2>/dev/null || true

# Build the application
RUN bun run build

# Production stage
FROM oven/bun:1-slim

WORKDIR /app

# Copy built application from builder
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./
COPY --from=builder /app/bun.lock ./
# Copy VERSION file from project root
COPY --from=builder /app/VERSION ./VERSION

# Install production dependencies only
RUN bun install --frozen-lockfile --production

# Expose port (can be configured via PORT env var)
EXPOSE 8000

# Set default environment variables
ENV PORT=8000
ENV NODE_ENV=production

# Start the application
CMD ["bun", "run", "build/index.js"]

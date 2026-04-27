# ---------- Frontend build (Bun) ----------
FROM oven/bun:1 AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package.json frontend/bun.lock ./
RUN bun install --frozen-lockfile

COPY frontend .
COPY VERSION /app/VERSION

RUN cp /app/VERSION static/VERSION 2>/dev/null || true
RUN bun run build


# ---------- Base runtime (Debian + deps + Deno + Bun + Supervisor) ----------
FROM debian:12-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl fontconfig python3 weasyprint \
    fonts-dejavu fonts-liberation fonts-noto \
    libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b libharfbuzz-subset0 \
    libcairo2 libglib2.0-0 libexpat1 \
    supervisor \
  && rm -rf /var/lib/apt/lists/*

# Install Deno
COPY --from=denoland/deno:bin-2.6.8 /deno /usr/local/bin/deno

# Install Bun
COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun

# ---------- App setup ----------
WORKDIR /app

# Backend
COPY backend ./backend

# Frontend build output
COPY --from=frontend-builder /app/frontend/build ./frontend/build
# Frontend runtime manifest for production dependency install
COPY frontend/package.json frontend/bun.lock ./frontend/
RUN cd /app/frontend && bun install --frozen-lockfile --production

# Shared files
COPY VERSION ./VERSION

# Data dir
RUN mkdir -p /app/data


# ---------- Config ----------
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 8000

CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/conf.d/supervisord.conf"]

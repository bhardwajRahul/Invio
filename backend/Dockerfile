# Runtime with Chromium (headless) for Puppeteer PDF rendering
FROM debian:12-slim

ENV DEBIAN_FRONTEND=noninteractive

# Install Chromium and fonts (works across architectures in buildx)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    fontconfig \
    tar \
    chromium \
  ghostscript \
    fonts-dejavu \
    fonts-liberation \
    fonts-noto \
    fonts-noto-cjk \
    fonts-noto-color-emoji \
    git \
    golang \
  && GOBIN=/usr/local/bin go install github.com/pdfcpu/pdfcpu/cmd/pdfcpu@v0.4.1 || \
     GOBIN=/usr/local/bin go install github.com/pdfcpu/pdfcpu/cmd/pdfcpu@latest \
  && apt-get purge -y --auto-remove git golang \
  && rm -rf /var/lib/apt/lists/* /root/go

# Install a Deno version that supports lockfile v5
COPY --from=denoland/deno:bin-2.4.5 /deno /usr/local/bin/deno

WORKDIR /app
COPY . .
RUN mkdir -p /app/data

ENV PORT=3000 \
  DATABASE_PATH=/app/data/invio.db \
  PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
  GHOSTSCRIPT_BIN=/usr/bin/gs

EXPOSE 3000
CMD ["deno", "task", "start"]
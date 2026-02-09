# Get chrome-headless-shell from chromedp (multi-arch: amd64 + arm64)
FROM chromedp/headless-shell:latest AS headless

# Runtime with chrome-headless-shell for fast PDF rendering
FROM debian:12-slim

ENV DEBIAN_FRONTEND=noninteractive

# Install minimal dependencies (no full Chromium/X11 needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    fontconfig \
    tar \
    unzip \
    ghostscript \
    fonts-dejavu \
    fonts-liberation \
    fonts-noto \
    fonts-noto-cjk \
    fonts-noto-color-emoji \
    git \
    golang \
    # Minimal libs needed by chrome-headless-shell
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libxshmfence1 \
    libx11-6 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrender1 \
    libxtst6 \
    libxss1 \
    libglib2.0-0 \
    libdbus-1-3 \
    libexpat1 \
  && GOBIN=/usr/local/bin go install github.com/pdfcpu/pdfcpu/cmd/pdfcpu@v0.4.1 || \
     GOBIN=/usr/local/bin go install github.com/pdfcpu/pdfcpu/cmd/pdfcpu@latest \
  && apt-get purge -y --auto-remove git golang \
  && rm -rf /var/lib/apt/lists/* /root/go

# Copy chrome-headless-shell from chromedp image
COPY --from=headless /headless-shell/ /opt/headless-shell/
RUN ln -s /opt/headless-shell/headless-shell /usr/local/bin/chrome-headless-shell \
  && chmod +x /opt/headless-shell/headless-shell

# Install a Deno version that supports lockfile v5
COPY --from=denoland/deno:bin-2.6.8 /deno /usr/local/bin/deno

WORKDIR /app
COPY . .
RUN mkdir -p /app/data

ENV PORT=3000 \
  DATABASE_PATH=/app/data/invio.db \
  CHROME_HEADLESS_SHELL_PATH=/usr/local/bin/chrome-headless-shell \
  GHOSTSCRIPT_BIN=/usr/bin/gs

EXPOSE 3000
CMD ["deno", "task", "start"]
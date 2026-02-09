# Runtime with chrome-headless-shell for fast PDF rendering
FROM debian:12-slim

ENV DEBIAN_FRONTEND=noninteractive

# Determine architecture and download chrome-headless-shell
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

# Install chrome-headless-shell from Chrome for Testing
RUN ARCH=$(dpkg --print-architecture) \
  && if [ "$ARCH" = "amd64" ]; then PLATFORM="linux64"; \
     elif [ "$ARCH" = "arm64" ]; then PLATFORM="linux-arm64"; \
     else echo "Unsupported arch: $ARCH" && exit 1; fi \
  && CHROME_VERSION=$(curl -s https://googlechromelabs.github.io/chrome-for-testing/LATEST_RELEASE_STABLE) \
  && echo "Installing chrome-headless-shell ${CHROME_VERSION} for ${PLATFORM}" \
  && curl -fSL "https://storage.googleapis.com/chrome-for-testing-public/${CHROME_VERSION}/${PLATFORM}/chrome-headless-shell-${PLATFORM}.zip" -o /tmp/chrome-headless-shell.zip \
  && unzip /tmp/chrome-headless-shell.zip -d /opt/ \
  && ln -s /opt/chrome-headless-shell-${PLATFORM}/chrome-headless-shell /usr/local/bin/chrome-headless-shell \
  && chmod +x /opt/chrome-headless-shell-${PLATFORM}/chrome-headless-shell \
  && rm /tmp/chrome-headless-shell.zip

# Install a Deno version that supports lockfile v5
COPY --from=denoland/deno:bin-2.4.5 /deno /usr/local/bin/deno

WORKDIR /app
COPY . .
RUN mkdir -p /app/data

ENV PORT=3000 \
  DATABASE_PATH=/app/data/invio.db \
  CHROME_HEADLESS_SHELL_PATH=/usr/local/bin/chrome-headless-shell \
  GHOSTSCRIPT_BIN=/usr/bin/gs

EXPOSE 3000
CMD ["deno", "task", "start"]
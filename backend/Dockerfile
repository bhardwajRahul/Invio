# Runtime with Google Chrome (headless) for Puppeteer PDF rendering
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install Google Chrome Stable and fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    gnupg \
    curl \
    fontconfig \
    fonts-dejavu \
    fonts-liberation \
    fonts-noto \
    fonts-noto-cjk \
    fonts-noto-color-emoji \
  && rm -rf /var/lib/apt/lists/* && \
  mkdir -p /etc/apt/keyrings && \
  curl -fsSL https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /etc/apt/keyrings/google-linux.gpg && \
  echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/google-linux.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list && \
  apt-get update && apt-get install -y --no-install-recommends google-chrome-stable && \
  rm -rf /var/lib/apt/lists/*

# Install a Deno version that supports lockfile v5
COPY --from=denoland/deno:bin-2.4.5 /deno /usr/local/bin/deno

WORKDIR /app
COPY . .
RUN mkdir -p /app/data

ENV PORT=3000 \
  DATABASE_PATH=/app/data/invio.db \
  PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

EXPOSE 3000
CMD ["deno", "task", "start"]
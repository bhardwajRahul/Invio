# Runtime with wkhtmltopdf preinstalled (Ubuntu)
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# wkhtmltopdf + fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    wkhtmltopdf \
    ca-certificates \
    fontconfig \
    fonts-dejavu \
    fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

# Install a Deno version that supports lockfile v5
COPY --from=denoland/deno:bin-2.4.5 /deno /usr/local/bin/deno

WORKDIR /app
COPY . .
RUN mkdir -p /app/data

ENV PORT=3000 \
    DATABASE_PATH=/app/data/invio.db

EXPOSE 3000
CMD ["deno", "task", "start"]
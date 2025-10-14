# Frontend (Deno Fresh) production image
FROM denoland/deno:debian

WORKDIR /app

# Copy frontend source
COPY . /app

# Cache imports
RUN deno cache main.ts dev.ts

# Build with platform-specific handling
# Skip build for ARM64 in emulation (causes QEMU issues)
# Fresh can run without pre-build in production mode
RUN if [ "$(uname -m)" = "x86_64" ]; then \
      deno task build; \
    else \
      echo "Skipping build on ARM64 - will build on first request"; \
    fi

# Default env; BACKEND_URL should point to backend service in compose
ENV PORT=8000 \
    BACKEND_URL=http://backend:3000

EXPOSE 8000

# Run the production preview server
CMD ["deno", "run", "-A", "main.ts"]

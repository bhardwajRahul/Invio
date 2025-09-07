# Frontend (Deno Fresh) production image
FROM denoland/deno:debian

WORKDIR /app

# Copy frontend source
COPY . /app

# Cache imports and build the app
RUN deno cache main.ts dev.ts \
 && deno task build

# Default env; BACKEND_URL should point to backend service in compose
ENV PORT=8000 \
    BACKEND_URL=http://backend:3000

EXPOSE 8000

# Run the production preview server
CMD ["deno", "run", "-A", "main.ts"]

import { MiddlewareHandler } from "$fresh/server.ts";

const SECURE_HEADERS_DISABLED = (Deno.env.get("FRONTEND_SECURE_HEADERS_DISABLED") || "").toLowerCase() === "true";
const HSTS_ENABLED = (Deno.env.get("ENABLE_HSTS") || "").toLowerCase() === "true";
const CONTENT_SECURITY_POLICY = Deno.env.get("FRONTEND_CONTENT_SECURITY_POLICY") ||
  "default-src 'self'; " +
  "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; " +
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; " +
  "img-src 'self' data: https:; " +
  "font-src 'self' data: https://fonts.gstatic.com; " +
  "connect-src 'self' http://localhost:3000 https: ws: wss:; " +
  "frame-ancestors 'none'; form-action 'self'; object-src 'none'; base-uri 'none'";

export const handler: MiddlewareHandler = async (req, ctx) => {
  const res = await ctx.next();
  if (SECURE_HEADERS_DISABLED) return res;

  const headers = res.headers;
  if (!headers.has("X-Content-Type-Options")) {
    headers.set("X-Content-Type-Options", "nosniff");
  }
  if (!headers.has("X-Frame-Options")) {
    headers.set("X-Frame-Options", "DENY");
  }
  if (!headers.has("Referrer-Policy")) {
    headers.set("Referrer-Policy", "no-referrer");
  }
  if (!headers.has("Permissions-Policy")) {
    headers.set("Permissions-Policy", "accelerometer=(), autoplay=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()");
  }
  if (!headers.has("Cross-Origin-Opener-Policy")) {
    headers.set("Cross-Origin-Opener-Policy", "same-origin");
  }
  if (!headers.has("Cross-Origin-Resource-Policy")) {
    headers.set("Cross-Origin-Resource-Policy", "same-site");
  }
  if (!headers.has("Content-Security-Policy")) {
    headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
  }
  if (HSTS_ENABLED) {
    const url = new URL(req.url);
    if (url.protocol === "https:" && !headers.has("Strict-Transport-Security")) {
      headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
  }

  return res;
};

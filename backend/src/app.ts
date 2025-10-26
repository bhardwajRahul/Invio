import { Hono } from "hono";
import type { Context } from "hono";
import { cors } from "hono/cors";
import { initDatabase, resetDatabaseFromDemo } from "./database/init.ts";
import { adminRoutes } from "./routes/admin.ts";
import { publicRoutes } from "./routes/public.ts";
import { authRoutes } from "./routes/auth.ts";

const SECURE_HEADERS_DISABLED = (Deno.env.get("SECURE_HEADERS_DISABLED") || "").toLowerCase() === "true";
const HSTS_ENABLED = (Deno.env.get("ENABLE_HSTS") || "").toLowerCase() === "true";
const CONTENT_SECURITY_POLICY = Deno.env.get("CONTENT_SECURITY_POLICY") ||
  "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; script-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; connect-src 'self'";

const app = new Hono();

// Check for required credentials in environment
const requiredEnv = ["ADMIN_USER", "ADMIN_PASS", "JWT_SECRET"];
const missing = requiredEnv.filter((key) => !Deno.env.get(key));
if (missing.length > 0) {
  console.error(
    `FATAL: Missing required environment variables: ${missing.join(", ")}. Refusing to start.`,
  );
  Deno.exit(1);
}

// Initialize the database
initDatabase();

// In demo mode, schedule a periodic reset of the database from DEMO_DB_PATH.
// Writes are allowed between resets.
try {
  const demoMode = (Deno.env.get("DEMO_MODE") || "").toLowerCase() === "true";
  if (demoMode) {
    const hours = Number(Deno.env.get("DEMO_RESET_HOURS") || "3");
    const initial =
      (Deno.env.get("DEMO_RESET_ON_START") || "true").toLowerCase() !== "false";
    if (initial) {
      // Perform a reset at startup to ensure a pristine state
      resetDatabaseFromDemo();
    }
    const ms = Math.max(1, Math.floor(hours * 60 * 60 * 1000));
    setInterval(() => {
      try {
        resetDatabaseFromDemo();
      } catch (e) {
        console.error("Periodic demo reset failed:", e);
      }
    }, ms);
    console.log(`Demo mode: periodic DB reset scheduled every ${hours}h`);
  }
} catch (e) {
  console.warn("Demo reset scheduler could not be started:", e);
}

// Middleware
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use("*", async (c, next) => {
  await next();
  if (SECURE_HEADERS_DISABLED) return;
  const headers = c.res.headers;
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
  if (HSTS_ENABLED && !headers.has("Strict-Transport-Security")) {
    const proto = c.req.header("x-forwarded-proto")?.toLowerCase() || (c.req.url.startsWith("https://") ? "https" : "http");
    if (proto === "https") {
      headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
  }
});

// Routes
app.route("/api/v1", adminRoutes);
app.route("/api/v1", publicRoutes);
app.route("/api/v1", authRoutes);

// Health check
app.get("/", (c: Context) => c.redirect("/health"));

app.get("/health", (c: Context) => {
  try {
    // Light DB check via pragma
    // If the DB is not initialized, initDatabase() above would have thrown.
    return c.json({ status: "ok" }, 200);
  } catch (_e) {
    return c.json({ status: "error" }, 500);
  }
});

// Start the server: allow configuration via BACKEND_PORT or PORT env vars
const rawPort = Deno.env.get("BACKEND_PORT") || Deno.env.get("PORT");
const port = rawPort ? parseInt(rawPort, 10) : 3000;
if (Number.isNaN(port) || port <= 0) {
  console.warn(
    `Invalid port in BACKEND_PORT/PORT (${rawPort}), falling back to 3000`,
  );
}
const listenPort = Number.isFinite(port) && port > 0 ? port : 3000;
console.log(`Starting backend on port ${listenPort}`);
Deno.serve({ port: listenPort }, app.fetch);

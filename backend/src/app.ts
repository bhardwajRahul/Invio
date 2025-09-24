import { Hono } from "hono";
import type { Context } from "hono";
import { cors } from "hono/cors";
import { initDatabase, resetDatabaseFromDemo } from "./database/init.ts";
import { adminRoutes } from "./routes/admin.ts";
import { publicRoutes } from "./routes/public.ts";
import { authRoutes } from "./routes/auth.ts";

const app = new Hono();

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

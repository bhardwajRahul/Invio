import { Hono } from "hono";
import { cors } from "hono/cors";
import { initDatabase } from "./database/init.ts";
import { adminRoutes } from "./routes/admin.ts";
import { publicRoutes } from "./routes/public.ts";
import { authRoutes } from "./routes/auth.ts";

const app = new Hono();

// Initialize the database
initDatabase();

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
app.get("/", (c) => c.redirect("/health"));

app.get("/health", (c) => {
  try {
    // Light DB check via pragma
    // If the DB is not initialized, initDatabase() above would have thrown.
    return c.json({ status: "ok" }, 200);
  } catch (_e) {
    return c.json({ status: "error" }, 500);
  }
});

// Start the server
Deno.serve({ port: 3000 }, app.fetch);

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
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

// Routes
app.route("/api/v1", adminRoutes);
app.route("/api/v1", publicRoutes);
app.route("/api/v1", authRoutes);

// Health check
app.get("/", (c) => {
  return c.json({ message: "Invio API is running!", version: "1.0.0" });
});

// Start the server
Deno.serve({ port: 3000 }, app.fetch);
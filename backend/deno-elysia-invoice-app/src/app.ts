import { Elysia } from "elysia";
import { cors } from "./middleware/cors.ts";
import { auth } from "./middleware/auth.ts";
import adminRoutes from "./routes/admin.ts";
import publicRoutes from "./routes/public.ts";
import authRoutes from "./routes/auth.ts";
import { initDatabase } from "./database/init.ts";

const app = new Elysia();

// Initialize the database
await initDatabase();

// Middleware
app.use(cors());
app.use(auth());

// Routes
app.use(adminRoutes);
app.use(publicRoutes);
app.use(authRoutes);

// Start the server
app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
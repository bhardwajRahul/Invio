import { load } from "dotenv";

let envLoaded = false;

async function loadEnvOnce() {
  if (envLoaded) return;
  try {
    await load({ export: true });
  } catch (error) {
    // Ignore missing .env files, surface other errors for visibility
    if (!(error instanceof Deno.errors.NotFound)) {
      console.warn("Failed to load .env file:", error);
    }
  }
  envLoaded = true;
}

await loadEnvOnce();

export function getEnv(key: string, fallback?: string): string | undefined {
  const value = Deno.env.get(key);
  if (value === undefined || value === "") {
    return fallback;
  }
  return value;
}

export function requireEnv(key: string): string {
  const value = getEnv(key);
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function ensureEnv(keys: string[]): void {
  const missing = keys.filter((key) => getEnv(key) === undefined);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
}

export function getAdminCredentials() {
  return {
    username: requireEnv("ADMIN_USER"),
    password: requireEnv("ADMIN_PASS"),
  };
}

export function getJwtSecret(): string {
  return requireEnv("JWT_SECRET");
}

export function isDemoMode(): boolean {
  return (getEnv("DEMO_MODE", "false") || "false").toLowerCase() === "true";
}

export function getNumberEnv(key: string, fallback: number): number {
  const raw = getEnv(key);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

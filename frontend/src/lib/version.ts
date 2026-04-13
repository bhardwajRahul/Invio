/**
 * Version utility
 * Reads the version from the VERSION file at the project root
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

let cachedVersion: string | null = null;

/**
 * Get the application version
 * @returns The version string, or "unknown" if it cannot be read
 */
export function getVersion(): string {
  if (cachedVersion !== null) {
    return cachedVersion;
  }

  try {
    // Try multiple paths to find VERSION file
    const paths = [
      join(process.cwd(), "VERSION"), // Production: /app/VERSION
      join(process.cwd(), "..", "VERSION"), // Development from frontend/
      join(process.cwd(), "static", "VERSION"), // In static assets
    ];

    for (const path of paths) {
      try {
        const version = readFileSync(path, "utf-8").trim();
        if (version) {
          cachedVersion = version;
          return version;
        }
      } catch {
        // Try next path
      }
    }
  } catch (err) {
    console.warn("Failed to read VERSION file:", err);
  }

  cachedVersion = "unknown";
  return cachedVersion;
}

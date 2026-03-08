import { getDatabase } from "../database/init.ts";
import { generateUUID } from "../utils/uuid.ts";
import { hashPassword, verifyPassword } from "../utils/password.ts";
import type {
  User,
  UserWithPermissions,
  Permission,
  CreateUserRequest,
  UpdateUserRequest,
  Resource,
  Action,
} from "../types/index.ts";

// ---- Helpers ----

function rowToUser(row: unknown[]): User {
  return {
    id: String(row[0]),
    username: String(row[1]),
    email: row[2] ? String(row[2]) : undefined,
    displayName: row[3] ? String(row[3]) : undefined,
    isAdmin: Boolean(row[4]),
    isActive: Boolean(row[5]),
    createdAt: new Date(String(row[6])),
    updatedAt: new Date(String(row[7])),
  };
}

function loadPermissions(userId: string): Permission[] {
  const db = getDatabase();
  const rows = db.query(
    "SELECT resource, action FROM user_permissions WHERE user_id = ?",
    [userId],
  );
  return rows.map((r) => ({
    resource: String((r as unknown[])[0]) as Resource,
    action: String((r as unknown[])[1]) as Action,
  }));
}

function setPermissions(userId: string, permissions: Permission[]): void {
  const db = getDatabase();
  db.query("DELETE FROM user_permissions WHERE user_id = ?", [userId]);
  for (const p of permissions) {
    db.query(
      "INSERT INTO user_permissions (id, user_id, resource, action) VALUES (?, ?, ?, ?)",
      [generateUUID(), userId, p.resource, p.action],
    );
  }
}

// ---- Public API ----

export function listUsers(): User[] {
  const db = getDatabase();
  const rows = db.query(
    "SELECT id, username, email, display_name, is_admin, is_active, created_at, updated_at FROM users ORDER BY created_at ASC",
  );
  return rows.map((r) => rowToUser(r as unknown[]));
}

export function getUserById(id: string): UserWithPermissions | null {
  const db = getDatabase();
  const rows = db.query(
    "SELECT id, username, email, display_name, is_admin, is_active, created_at, updated_at FROM users WHERE id = ?",
    [id],
  );
  if (rows.length === 0) return null;
  const user = rowToUser(rows[0] as unknown[]) as UserWithPermissions;
  user.permissions = loadPermissions(user.id);
  return user;
}

export function getUserByUsername(username: string): UserWithPermissions | null {
  const db = getDatabase();
  const rows = db.query(
    "SELECT id, username, email, display_name, is_admin, is_active, created_at, updated_at FROM users WHERE username = ?",
    [username],
  );
  if (rows.length === 0) return null;
  const user = rowToUser(rows[0] as unknown[]) as UserWithPermissions;
  user.permissions = loadPermissions(user.id);
  return user;
}

/**
 * Retrieve only the password hash for a user by username.
 * Used during authentication.
 */
export function getPasswordHash(username: string): string | null {
  const db = getDatabase();
  const rows = db.query(
    "SELECT password_hash FROM users WHERE username = ?",
    [username],
  );
  if (rows.length === 0) return null;
  return String((rows[0] as unknown[])[0]);
}

export async function createUser(data: CreateUserRequest): Promise<UserWithPermissions> {
  const db = getDatabase();

  // Validate required fields
  if (!data.username || data.username.trim().length === 0) {
    throw new Error("Username is required");
  }
  if (!data.password || data.password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  // Check uniqueness
  const existing = db.query("SELECT id FROM users WHERE username = ?", [
    data.username.trim(),
  ]);
  if (existing.length > 0) {
    throw new Error("Username already exists");
  }

  const id = generateUUID();
  const now = new Date().toISOString();
  const passwordHash = await hashPassword(data.password);

  db.query(
    `INSERT INTO users (id, username, email, display_name, password_hash, is_admin, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      id,
      data.username.trim(),
      data.email?.trim() || null,
      data.displayName?.trim() || null,
      passwordHash,
      data.isAdmin ? 1 : 0,
      now,
      now,
    ],
  );

  // Set permissions
  if (data.permissions && data.permissions.length > 0) {
    setPermissions(id, data.permissions);
  }

  return getUserById(id)!;
}

export async function updateUser(
  id: string,
  data: UpdateUserRequest,
): Promise<UserWithPermissions> {
  const db = getDatabase();

  const existing = getUserById(id);
  if (!existing) throw new Error("User not found");

  const now = new Date().toISOString();
  const updates: string[] = [];
  const params: (string | number | null)[] = [];

  if (data.username !== undefined) {
    // Check uniqueness if changing username
    const dup = db.query(
      "SELECT id FROM users WHERE username = ? AND id != ?",
      [data.username.trim(), id],
    );
    if (dup.length > 0) throw new Error("Username already exists");
    updates.push("username = ?");
    params.push(data.username.trim());
  }

  if (data.email !== undefined) {
    updates.push("email = ?");
    params.push(data.email?.trim() || null);
  }

  if (data.displayName !== undefined) {
    updates.push("display_name = ?");
    params.push(data.displayName?.trim() || null);
  }

  if (data.isAdmin !== undefined) {
    updates.push("is_admin = ?");
    params.push(data.isAdmin ? 1 : 0);
  }

  if (data.isActive !== undefined) {
    updates.push("is_active = ?");
    params.push(data.isActive ? 1 : 0);
  }

  if (data.password !== undefined && data.password.length > 0) {
    if (data.password.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }
    const hash = await hashPassword(data.password);
    updates.push("password_hash = ?");
    params.push(hash);
  }

  if (updates.length > 0) {
    updates.push("updated_at = ?");
    params.push(now);
    params.push(id);
    db.query(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, params);
  }

  // Update permissions if provided
  if (data.permissions !== undefined) {
    setPermissions(id, data.permissions);
  }

  return getUserById(id)!;
}

export function deleteUser(id: string): void {
  const db = getDatabase();
  const existing = getUserById(id);
  if (!existing) throw new Error("User not found");

  // Prevent deleting the last admin
  if (existing.isAdmin) {
    const adminCount = db.query(
      "SELECT COUNT(*) FROM users WHERE is_admin = 1 AND is_active = 1",
    );
    const count = Number((adminCount[0] as unknown[])[0]);
    if (count <= 1) {
      throw new Error("Cannot delete the last admin user");
    }
  }

  db.query("DELETE FROM users WHERE id = ?", [id]);
}

/**
 * Authenticate a user by username and password.
 * Returns the user with permissions if valid, null otherwise.
 */
export async function authenticateUser(
  username: string,
  password: string,
): Promise<UserWithPermissions | null> {
  const hash = getPasswordHash(username);
  if (!hash) return null;

  const valid = await verifyPassword(password, hash);
  if (!valid) return null;

  const user = getUserByUsername(username);
  if (!user || !user.isActive) return null;

  return user;
}

/**
 * Check if any users exist in the database.
 * Used during startup to determine if the admin seed is needed.
 */
export function hasUsers(): boolean {
  const db = getDatabase();
  const rows = db.query("SELECT COUNT(*) FROM users");
  return Number((rows[0] as unknown[])[0]) > 0;
}

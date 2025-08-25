import { Database } from "https://deno.land/x/sqlite/mod.ts";

export class Setting {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async getSetting(key: string): Promise<string | null> {
    const result = await this.db.query("SELECT value FROM settings WHERE key = ?", [key]);
    const row = result.next();
    return row ? row[0] : null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await this.db.execute("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [key, value]);
  }

  async getAllSettings(): Promise<Record<string, string>> {
    const settings: Record<string, string> = {};
    for await (const [key, value] of this.db.query("SELECT key, value FROM settings")) {
      settings[key] = value;
    }
    return settings;
  }
}
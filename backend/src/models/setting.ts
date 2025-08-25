import { DB } from "sqlite";

export class Setting {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  async getSetting(key: string): Promise<string | null> {
    const result = await this.db.query("SELECT value FROM settings WHERE key = ?", [key]);
    return result.length > 0 ? result[0][0] as string : null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await this.db.query("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [key, value]);
  }

  async getAllSettings(): Promise<Record<string, string>> {
    const result = await this.db.query("SELECT key, value FROM settings");
    const settings: Record<string, string> = {};
    for (const row of result) {
      const rowArray = row as unknown[];
      const key = rowArray[0] as string;
      const value = rowArray[1] as string;
      settings[key] = value;
    }
    return settings;
  }
}
import { getDatabase } from "../database/init.ts";
import { Setting } from "../types/index.ts";

export const getSettings = () => {
  const db = getDatabase();
  const results = db.query("SELECT * FROM settings");
  return results.map((row: unknown[]) => ({
    key: row[0] as string,
    value: row[1] as string,
  }));
};

export const updateSettings = (data: Record<string, string>) => {
  const db = getDatabase();
  const results: Setting[] = [];
  
  for (const [key, value] of Object.entries(data)) {
    // Upsert the setting
    const existing = db.query("SELECT * FROM settings WHERE key = ?", [key]);
    if (existing.length > 0) {
      db.query("UPDATE settings SET value = ? WHERE key = ?", [value, key]);
    } else {
      db.query("INSERT INTO settings (key, value) VALUES (?, ?)", [key, value]);
    }
    results.push({ key, value });
  }
  
  return results;
};

export const getSetting = (key: string) => {
  const db = getDatabase();
  const result = db.query("SELECT value FROM settings WHERE key = ?", [key]);
  return result.length > 0 ? result[0][0] : null;
};

export const setSetting = (key: string, value: string) => {
  const db = getDatabase();
  const existing = db.query("SELECT * FROM settings WHERE key = ?", [key]);
  
  if (existing.length > 0) {
    db.query("UPDATE settings SET value = ? WHERE key = ?", [value, key]);
  } else {
    db.query("INSERT INTO settings (key, value) VALUES (?, ?)", [key, value]);
  }
  
  return { key, value };
};
import { Database } from "https://deno.land/x/sqlite/mod.ts";

export class Template {
  id: string;
  name: string;
  html: string;
  createdAt: Date;

  constructor(id: string, name: string, html: string, createdAt: Date) {
    this.id = id;
    this.name = name;
    this.html = html;
    this.createdAt = createdAt;
  }

  static async create(db: Database, name: string, html: string): Promise<Template> {
    const id = crypto.randomUUID();
    const createdAt = new Date();
    await db.execute(
      "INSERT INTO templates (id, name, html, created_at) VALUES (?, ?, ?, ?)",
      [id, name, html, createdAt.toISOString()]
    );
    return new Template(id, name, html, createdAt);
  }

  static async findById(db: Database, id: string): Promise<Template | null> {
    const result = await db.query("SELECT * FROM templates WHERE id = ?", [id]);
    const row = result.next();
    return row ? new Template(row[0], row[1], row[2], new Date(row[3])) : null;
  }

  static async update(db: Database, id: string, name: string, html: string): Promise<void> {
    await db.execute(
      "UPDATE templates SET name = ?, html = ? WHERE id = ?",
      [name, html, id]
    );
  }

  static async delete(db: Database, id: string): Promise<void> {
    await db.execute("DELETE FROM templates WHERE id = ?", [id]);
  }

  static async getAll(db: Database): Promise<Template[]> {
    const templates: Template[] = [];
    const result = await db.query("SELECT * FROM templates");
    for (const row of result) {
      templates.push(new Template(row[0], row[1], row[2], new Date(row[3])));
    }
    return templates;
  }
}
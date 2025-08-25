import { DB } from "sqlite";

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

  static async create(db: DB, name: string, html: string): Promise<Template> {
    const id = crypto.randomUUID();
    const createdAt = new Date();
    await db.query(
      "INSERT INTO templates (id, name, html, created_at) VALUES (?, ?, ?, ?)",
      [id, name, html, createdAt.toISOString()]
    );
    return new Template(id, name, html, createdAt);
  }

  static async findById(db: DB, id: string): Promise<Template | null> {
    const result = await db.query("SELECT * FROM templates WHERE id = ?", [id]);
    if (result.length === 0) return null;
    const row = result[0] as unknown[];
    return new Template(row[0] as string, row[1] as string, row[2] as string, new Date(row[3] as string));
  }

  static async update(db: DB, id: string, name: string, html: string): Promise<void> {
    await db.query(
      "UPDATE templates SET name = ?, html = ? WHERE id = ?",
      [name, html, id]
    );
  }

  static async delete(db: DB, id: string): Promise<void> {
    await db.query("DELETE FROM templates WHERE id = ?", [id]);
  }

  static async getAll(db: DB): Promise<Template[]> {
    const templates: Template[] = [];
    const result = await db.query("SELECT * FROM templates");
    for (const row of result) {
      const rowArray = row as unknown[];
      templates.push(new Template(rowArray[0] as string, rowArray[1] as string, rowArray[2] as string, new Date(rowArray[3] as string)));
    }
    return templates;
  }
}
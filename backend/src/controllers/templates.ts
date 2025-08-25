import { getDatabase } from "../database/init.ts";
import { Template } from "../types/index.ts";
import { generateUUID } from "../utils/uuid.ts";

export const getTemplates = () => {
  const db = getDatabase();
  const results = db.query("SELECT * FROM templates");
  return results.map((row: unknown[]) => ({
    id: row[0] as string,
    name: row[1] as string,
    html: row[2] as string,
    createdAt: new Date(row[3] as string),
  }));
};

export const createTemplate = (data: Partial<Template>) => {
  const db = getDatabase();
  const templateId = generateUUID();
  
  const template: Template = {
    id: templateId,
    name: data.name!,
    html: data.html!,
    createdAt: new Date()
  };

  db.query(
    "INSERT INTO templates (id, name, html, created_at) VALUES (?, ?, ?, ?)",
    [template.id, template.name, template.html, template.createdAt]
  );
  
  return template;
};

export const updateTemplate = (id: string, data: Partial<Template>) => {
  const db = getDatabase();
  db.query(
    "UPDATE templates SET name = ?, html = ? WHERE id = ?",
    [data.name, data.html, id]
  );
  
  const result = db.query("SELECT * FROM templates WHERE id = ?", [id]);
  if (result.length > 0) {
    const row = result[0] as unknown[];
    return {
      id: row[0] as string,
      name: row[1] as string,
      html: row[2] as string,
      createdAt: new Date(row[3] as string),
    };
  }
  return null;
};

export const deleteTemplate = (id: string) => {
  const db = getDatabase();
  db.query("DELETE FROM templates WHERE id = ?", [id]);
  return true;
};

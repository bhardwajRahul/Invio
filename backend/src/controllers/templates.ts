import { getDatabase } from "../database/init.ts";
import { Template } from "../types/index.ts";
import { generateUUID } from "../utils/uuid.ts";

export const getTemplates = () => {
  const db = getDatabase();
  const results = db.query("SELECT id, name, html, is_default, created_at FROM templates ORDER BY created_at DESC");
  return results.map((row: unknown[]) => ({
    id: row[0] as string,
    name: row[1] as string,
    html: row[2] as string,
    isDefault: row[3] as boolean,
    createdAt: new Date(row[4] as string),
  }));
};

export const getTemplateById = (id: string) => {
  const db = getDatabase();
  const results = db.query("SELECT id, name, html, is_default, created_at FROM templates WHERE id = ?", [id]);
  if (results.length === 0) return null;
  
  const row = results[0] as unknown[];
  return {
    id: row[0] as string,
    name: row[1] as string,
    html: row[2] as string,
    isDefault: row[3] as boolean,
    createdAt: new Date(row[4] as string),
  };
};

export const loadTemplateFromFile = async (filePath: string): Promise<string> => {
  try {
    return await Deno.readTextFile(filePath);
  } catch (error) {
    console.error(`Failed to load template from ${filePath}:`, error);
    throw new Error(`Template file not found: ${filePath}`);
  }
};

export const renderTemplate = (templateHtml: string, data: Record<string, unknown>): string => {
  // Lightweight Mustache-like renderer with block-first strategy
  const lookup = (obj: Record<string, unknown>, path: string): unknown => {
    const clean = path.trim().replace(/^['"]|['"]$/g, "");
    return clean.split('.').reduce<unknown>((acc, key) => {
      if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
        return (acc as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  };

  const merge = (a: Record<string, unknown>, b: Record<string, unknown>) => ({ ...a, ...b });

  const renderBlocks = (tpl: string, ctx: Record<string, unknown>): string => {
    const blockRe = /\{\{#([^}]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
    let result = tpl;
    let match: RegExpExecArray | null;
    // Iterate until no blocks remain
    while ((match = blockRe.exec(result)) !== null) {
      const [full, rawKey, inner] = match;
      const key = rawKey.trim();
      const val = lookup(ctx, key);
      let replacement = '';
      if (Array.isArray(val)) {
        replacement = val.map((it) => {
          const scope = merge(ctx, (it as Record<string, unknown>) || {});
          return renderAll(inner, scope);
        }).join('');
      } else if (val) {
        replacement = renderAll(inner, ctx);
      } else {
        replacement = '';
      }
      result = result.slice(0, match.index) + replacement + result.slice(match.index + full.length);
      blockRe.lastIndex = 0; // reset after modifying string
    }
    return result;
  };

  const renderVars = (tpl: string, ctx: Record<string, unknown>): string => {
    return tpl.replace(/\{\{([^}]+)\}\}/g, (m, raw) => {
      const key = String(raw).trim();
      if (key.startsWith('#') || key.startsWith('/')) return m; // skip block tags
      // default value support: {{var || 'default'}}
      if (key.includes('||')) {
        const [lhs, rhs] = key.split('||').map((s: string) => s.trim());
        const val = lookup(ctx, lhs.replace(/['"]/g, ''));
        if (val === undefined || val === null || val === '') {
          return rhs.replace(/^["']|["']$/g, '');
        }
        return String(val);
      }
      const v = lookup(ctx, key);
      return v !== undefined && v !== null ? String(v) : '';
    });
  };

  const renderAll = (tpl: string, ctx: Record<string, unknown>): string => {
    // First expand blocks, then simple variables
    const withBlocks = renderBlocks(tpl, ctx);
    return renderVars(withBlocks, ctx);
  };

  return renderAll(templateHtml, data);
};

export const createTemplate = (data: Partial<Template>) => {
  const db = getDatabase();
  const templateId = generateUUID();
  
  const template: Template = {
    id: templateId,
    name: data.name!,
    html: data.html!,
    isDefault: data.isDefault || false,
    createdAt: new Date()
  };

  db.query(
    "INSERT INTO templates (id, name, html, is_default, created_at) VALUES (?, ?, ?, ?, ?)",
    [template.id, template.name, template.html, template.isDefault, template.createdAt]
  );
  
  return template;
};

export const updateTemplate = (id: string, data: Partial<Template>) => {
  const db = getDatabase();
  db.query(
    "UPDATE templates SET name = ?, html = ?, is_default = ? WHERE id = ?",
    [data.name, data.html, data.isDefault, id]
  );
  
  const result = db.query("SELECT id, name, html, is_default, created_at FROM templates WHERE id = ?", [id]);
  if (result.length > 0) {
    const row = result[0] as unknown[];
    return {
      id: row[0] as string,
      name: row[1] as string,
      html: row[2] as string,
      isDefault: row[3] as boolean,
      createdAt: new Date(row[4] as string),
    };
  }
  return null;
};

export const deleteTemplate = (id: string) => {
  const db = getDatabase();
  db.query("DELETE FROM templates WHERE id = ?", [id]);
  return true;
};

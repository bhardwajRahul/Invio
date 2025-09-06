import { getDatabase } from "../database/init.ts";
import { Template } from "../types/index.ts";
import { generateUUID } from "../utils/uuid.ts";
import { parse as parseYaml } from "yaml";
// Manifest-based installer (MVP): one HTML file + optional fonts (ignored for now)

type ManifestHTML = {
  path: string;
  url: string;
  sha256?: string;
};

type TemplateManifest = {
  schema?: number;
  id: string;
  name: string;
  version: string;
  invio: string;
  html: ManifestHTML;
  // fonts?: { path: string; url: string; sha256?: string; weight?: number; style?: string }[];
  license?: string;
  source?: { manifestUrl?: string; homepage?: string };
};

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
  return await res.text();
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function basicHtmlSanity(html: string): void {
  const lower = html.toLowerCase();
  const bannedTags = ["<script", "<iframe", "<object", "<embed", "<img", "<video", "<audio", "<link "];
  for (const tag of bannedTags) {
    if (lower.includes(tag)) throw new Error(`HTML contains disallowed tag: ${tag}`);
  }
  // No external CSS imports or remote urls
  if (/[@]import\s+/i.test(lower)) throw new Error("CSS @import not allowed");
  if (/url\(\s*['\"]?https?:/i.test(lower)) throw new Error("External URLs in CSS not allowed");
  // Disallow inline event handlers (attribute boundary)
  if (/(\s|<)on[a-z]+\s*=\s*['\"]/i.test(lower)) throw new Error("Inline event handlers not allowed");
}

function assertManifestShape(m: unknown): asserts m is TemplateManifest {
  if (!m || typeof m !== "object") throw new Error("Manifest must be an object");
  const r = m as Record<string, unknown>;
  for (const k of ["id", "name", "version", "invio", "html"]) {
    if (!(k in r)) throw new Error(`Manifest missing ${k}`);
  }
  const html = r.html as Record<string, unknown>;
  if (!html || typeof html.path !== "string" || typeof html.url !== "string") {
    throw new Error("html.path and html.url are required");
  }
  if (!String(html.url).startsWith("http")) {
    throw new Error("html.url must be http(s)");
  }
}

export async function installTemplateFromManifest(manifestUrl: string) {
  if (!/^https?:\/\//i.test(manifestUrl)) throw new Error("Manifest URL must be http(s)");
  // Load YAML (fallback JSON)
  const text = await fetchText(manifestUrl);
  let manifest: TemplateManifest;
  try {
    manifest = parseYaml(text) as TemplateManifest;
  } catch (_e) {
    try {
      manifest = JSON.parse(text) as TemplateManifest;
    } catch {
      throw new Error("Manifest parse failed");
    }
  }
  assertManifestShape(manifest);
  // Fetch HTML
  const htmlRes = await fetch(manifest.html.url);
  if (!htmlRes.ok) throw new Error(`HTML fetch failed ${htmlRes.status}`);
  const htmlBuf = new Uint8Array(await htmlRes.arrayBuffer());
  if (htmlBuf.byteLength > 128 * 1024) throw new Error("HTML too large (>128KB)");
  // Verify sha if provided
  if (manifest.html.sha256 && manifest.html.sha256.trim()) {
    const digest = await sha256Hex(htmlBuf);
    if (digest.toLowerCase() !== manifest.html.sha256.toLowerCase()) {
      throw new Error("HTML sha256 mismatch");
    }
  }
  const html = new TextDecoder().decode(htmlBuf);
  basicHtmlSanity(html);

  // Persist to filesystem under data/templates/{id}/{version}/
  const baseDir = `./data/templates/${manifest.id}/${manifest.version}`;
  const outPath = `${baseDir}/${manifest.html.path}`;
  await Deno.mkdir(baseDir, { recursive: true });
  await Deno.writeFile(outPath, htmlBuf);

  // Upsert by provided id, keep single default truth elsewhere. Store HTML in DB for current renderer.
  const saved = upsertTemplateWithId(manifest.id, {
    name: `${manifest.name} ${manifest.version ? `v${manifest.version}` : ""}`.trim(),
    html,
    isDefault: false,
  });
  return saved;
}

export const getTemplates = () => {
  const db = getDatabase();
  const results = db.query(
    "SELECT id, name, html, is_default, created_at FROM templates ORDER BY created_at DESC",
  );
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
  const results = db.query(
    "SELECT id, name, html, is_default, created_at FROM templates WHERE id = ?",
    [id],
  );
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

export const loadTemplateFromFile = async (
  filePath: string,
): Promise<string> => {
  try {
    return await Deno.readTextFile(filePath);
  } catch (error) {
    console.error(`Failed to load template from ${filePath}:`, error);
    throw new Error(`Template file not found: ${filePath}`);
  }
};

export const renderTemplate = (
  templateHtml: string,
  data: Record<string, unknown>,
): string => {
  // Lightweight Mustache-like renderer with block-first strategy
  const lookup = (obj: Record<string, unknown>, path: string): unknown => {
    const clean = path.trim().replace(/^['"]|['"]$/g, "");
    return clean.split(".").reduce<unknown>((acc, key) => {
      if (
        acc && typeof acc === "object" &&
        key in (acc as Record<string, unknown>)
      ) {
        return (acc as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  };

  const merge = (a: Record<string, unknown>, b: Record<string, unknown>) => ({
    ...a,
    ...b,
  });

  const renderBlocks = (tpl: string, ctx: Record<string, unknown>): string => {
    const blockRe = /\{\{#([^}]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
    let result = tpl;
    let match: RegExpExecArray | null;
    // Iterate until no blocks remain
    while ((match = blockRe.exec(result)) !== null) {
      const [full, rawKey, inner] = match;
      const key = rawKey.trim();
      const val = lookup(ctx, key);
      let replacement = "";
      if (Array.isArray(val)) {
        replacement = val.map((it) => {
          const scope = merge(ctx, (it as Record<string, unknown>) || {});
          return renderAll(inner, scope);
        }).join("");
      } else if (val) {
        replacement = renderAll(inner, ctx);
      } else {
        replacement = "";
      }
      result = result.slice(0, match.index) + replacement +
        result.slice(match.index + full.length);
      blockRe.lastIndex = 0; // reset after modifying string
    }
    return result;
  };

  const renderVars = (tpl: string, ctx: Record<string, unknown>): string => {
    return tpl.replace(/\{\{([^}]+)\}\}/g, (m, raw) => {
      const key = String(raw).trim();
      if (key.startsWith("#") || key.startsWith("/")) return m; // skip block tags
      // default value support: {{var || 'default'}}
      if (key.includes("||")) {
        const [lhs, rhs] = key.split("||").map((s: string) => s.trim());
        const val = lookup(ctx, lhs.replace(/['"]/g, ""));
        if (val === undefined || val === null || val === "") {
          return rhs.replace(/^["']|["']$/g, "");
        }
        return String(val);
      }
      const v = lookup(ctx, key);
      return v !== undefined && v !== null ? String(v) : "";
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
    createdAt: new Date(),
  };

  // If this new template is marked as default, unset default on all others first
  if (template.isDefault) {
    db.query("UPDATE templates SET is_default = 0");
  }

  db.query(
    "INSERT INTO templates (id, name, html, is_default, created_at) VALUES (?, ?, ?, ?, ?)",
    [
      template.id,
      template.name,
      template.html,
      template.isDefault,
      template.createdAt,
    ],
  );

  return template;
};

// Insert or replace a template with a specific id (used by manifest installs)
export const upsertTemplateWithId = (
  id: string,
  data: Partial<Template>,
) => {
  const db = getDatabase();
  if (data.isDefault === true) {
    db.query("UPDATE templates SET is_default = 0 WHERE id != ?", [id]);
  }
  db.query(
    "INSERT OR REPLACE INTO templates (id, name, html, is_default, created_at) VALUES (?, ?, ?, ?, ?)",
    [
      id,
      data.name || id,
      data.html || "",
      data.isDefault || false,
      new Date().toISOString(),
    ],
  );
  return getTemplateById(id);
};

export const updateTemplate = (id: string, data: Partial<Template>) => {
  const db = getDatabase();
  // Enforce a single default when toggling isDefault to true
  if (data.isDefault === true) {
    db.query("UPDATE templates SET is_default = 0 WHERE id != ?", [id]);
  }

  db.query(
    "UPDATE templates SET name = ?, html = ?, is_default = ? WHERE id = ?",
    [data.name, data.html, data.isDefault, id],
  );

  const result = db.query(
    "SELECT id, name, html, is_default, created_at FROM templates WHERE id = ?",
    [id],
  );
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
  // Best-effort cleanup of stored files for this template id (all versions)
  try {
    const dir = `./data/templates/${id}`;
    // Remove recursively if exists
    Deno.removeSync(dir, { recursive: true });
  } catch (_e) {
    // ignore missing or permission errors
  }
  return true;
};

// Set the active default template by id, unsetting all others
export const setDefaultTemplate = (id: string) => {
  const db = getDatabase();
  // Reset all
  db.query("UPDATE templates SET is_default = 0");
  // Set requested id; ignore if not found (no rows updated)
  db.query("UPDATE templates SET is_default = 1 WHERE id = ?", [id]);
  return true;
};

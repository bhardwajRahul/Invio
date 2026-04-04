import { extname, normalize, relative, resolve } from "std/path";

const LOGO_PUBLIC_PREFIX = "/api/v1/public/assets/logos/";
const LOGO_BASE_DIR = resolve("./data/logos");

const MIME_TO_EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};

function ensureLogoDir() {
  Deno.mkdirSync(LOGO_BASE_DIR, { recursive: true });
}

function safeExtFromMimeOrName(mime: string, filename: string): string {
  const byMime = MIME_TO_EXT[mime.toLowerCase()];
  if (byMime) return byMime;
  const raw = extname(filename || "").toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"].includes(raw)) {
    return raw === ".jpeg" ? ".jpg" : raw;
  }
  return ".png";
}

function buildStoredFilename(ext: string): string {
  return `${Date.now()}-${crypto.randomUUID()}${ext}`;
}

export function isLogoPublicPath(value: string): boolean {
  return value.startsWith(LOGO_PUBLIC_PREFIX) || value.startsWith("/public/assets/logos/");
}

export function logoPublicPathForFileName(fileName: string): string {
  return `${LOGO_PUBLIC_PREFIX}${fileName}`;
}

export function resolveLogoFsPathFromPublicPath(pathLike: string): string | null {
  let name = "";
  if (pathLike.startsWith(LOGO_PUBLIC_PREFIX)) {
    name = pathLike.slice(LOGO_PUBLIC_PREFIX.length);
  } else if (pathLike.startsWith("/public/assets/logos/")) {
    name = pathLike.slice("/public/assets/logos/".length);
  } else {
    return null;
  }

  const normalized = normalize(name.replaceAll("\\", "/"));
  if (!normalized || normalized.startsWith("..") || normalized.includes("/")) {
    return null;
  }

  const candidate = resolve(LOGO_BASE_DIR, normalized);
  const rel = relative(LOGO_BASE_DIR, candidate);
  if (!rel || rel.startsWith("..")) return null;
  return candidate;
}

export function contentTypeFromLogoPath(path: string): string {
  const ext = extname(path).toLowerCase();
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
}

export async function saveUploadedLogoFile(file: File): Promise<string> {
  if (!file.type || !file.type.startsWith("image/")) {
    throw new Error("Invalid file type. Please upload an image.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Logo file too large (max 5MB).");
  }

  ensureLogoDir();
  const ext = safeExtFromMimeOrName(file.type, file.name || "logo");
  const stored = buildStoredFilename(ext);
  const outPath = resolve(LOGO_BASE_DIR, stored);
  const bytes = new Uint8Array(await file.arrayBuffer());
  await Deno.writeFile(outPath, bytes);
  return logoPublicPathForFileName(stored);
}

export async function saveDataUrlLogo(dataUrl: string): Promise<string> {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid data URL format");
  }

  const mime = match[1].toLowerCase();
  const b64 = match[2];
  const ext = safeExtFromMimeOrName(mime, "logo");
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

  if (bytes.byteLength > 5 * 1024 * 1024) {
    throw new Error("Logo image too large (max 5MB).");
  }

  ensureLogoDir();
  const stored = buildStoredFilename(ext);
  const outPath = resolve(LOGO_BASE_DIR, stored);
  await Deno.writeFile(outPath, bytes);
  return logoPublicPathForFileName(stored);
}

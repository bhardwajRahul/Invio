// chrome-headless-shell candidates (preferred – lightweight, fast)
const HEADLESS_SHELL_UNIX_CANDIDATES = [
  "/usr/local/bin/chrome-headless-shell",
  "/usr/bin/chrome-headless-shell",
];

const HEADLESS_SHELL_MAC_CANDIDATES = [
  "/Applications/chrome-headless-shell",
];

const HEADLESS_SHELL_WINDOWS_CANDIDATES = [
  "C:/Program Files/chrome-headless-shell/chrome-headless-shell.exe",
  "C:/Program Files (x86)/chrome-headless-shell/chrome-headless-shell.exe",
];

// Full Chrome / Chromium fallbacks
const UNIX_CANDIDATES = [
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/chrome",
];

const MAC_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
];

const WINDOWS_CANDIDATES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files/Chromium/Application/chrome.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
];

function candidatePaths(): string[] {
  // Prefer explicit env vars for chrome-headless-shell, then fall back to PUPPETEER_EXECUTABLE_PATH
  const envShell = Deno.env.get("CHROME_HEADLESS_SHELL_PATH");
  const envPuppeteer = Deno.env.get("PUPPETEER_EXECUTABLE_PATH");
  const list: string[] = [];
  if (envShell && envShell.trim()) {
    list.push(envShell.trim());
  }
  if (envPuppeteer && envPuppeteer.trim()) {
    list.push(envPuppeteer.trim());
  }

  const platform = Deno.build.os;
  if (platform === "windows") {
    list.push(...HEADLESS_SHELL_WINDOWS_CANDIDATES, ...WINDOWS_CANDIDATES);
  } else if (platform === "darwin") {
    list.push(...HEADLESS_SHELL_MAC_CANDIDATES, ...MAC_CANDIDATES);
  } else {
    list.push(...HEADLESS_SHELL_UNIX_CANDIDATES, ...UNIX_CANDIDATES);
  }
  return list;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    const stat = await Deno.stat(path);
    return stat.isFile;
  } catch (_e) {
    return false;
  }
}

export async function findChromiumExecutable(candidates = candidatePaths()): Promise<string | undefined> {
  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

export async function resolveChromiumPath(): Promise<{ executablePath: string; candidates: string[] }> {
  const candidates = candidatePaths();
  const executablePath = await findChromiumExecutable(candidates);
  if (executablePath) {
    return { executablePath, candidates };
  }
  throw new Error(
    "No chrome-headless-shell or Chromium executable found. " +
    "Set CHROME_HEADLESS_SHELL_PATH (or PUPPETEER_EXECUTABLE_PATH) to the binary path. Checked: " +
    candidates.join(", "),
  );
}

export async function logChromiumAvailability(): Promise<void> {
  try {
    const { executablePath } = await resolveChromiumPath();
    console.log(`Chrome/Chromium executable detected at ${executablePath}`);
  } catch {
    const candidates = candidatePaths();
    console.error(
      "⚠️  No chrome-headless-shell or Chromium executable detected. " +
      "PDF generation requires chrome-headless-shell or Google Chrome/Chromium. " +
      "Set CHROME_HEADLESS_SHELL_PATH or PUPPETEER_EXECUTABLE_PATH. Checked paths: " +
        candidates.join(", "),
    );
  }
}

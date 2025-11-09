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
  const envPath = Deno.env.get("PUPPETEER_EXECUTABLE_PATH");
  const list: string[] = [];
  if (envPath && envPath.trim()) {
    list.push(envPath.trim());
  }

  const platform = Deno.build.os;
  if (platform === "windows") {
    list.push(...WINDOWS_CANDIDATES);
  } else if (platform === "darwin") {
    list.push(...MAC_CANDIDATES);
  } else {
    list.push(...UNIX_CANDIDATES);
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

export async function resolveChromiumLaunchConfig(): Promise<{ executablePath?: string; channel?: string; candidates: string[] }> {
  const candidates = candidatePaths();
  const executablePath = await findChromiumExecutable(candidates);
  if (executablePath) {
    return { executablePath, candidates };
  }
  const channel = Deno.env.get("PUPPETEER_CHANNEL")?.trim() || "chrome";
  return { channel, candidates };
}

export async function logChromiumAvailability(): Promise<void> {
  const { executablePath, candidates } = await resolveChromiumLaunchConfig();
  if (executablePath) {
    console.log(`Chromium executable detected at ${executablePath}`);
    return;
  }
  console.error(
    "⚠️  No Chromium executable detected. PDF generation requires Google Chrome, Chromium, or setting PUPPETEER_EXECUTABLE_PATH. Checked paths: " +
      candidates.join(", "),
  );
}

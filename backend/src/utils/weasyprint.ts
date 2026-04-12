function candidatePaths(): string[] {
  const envBin = Deno.env.get("WEASYPRINT_BIN");
  const list: string[] = [];
  if (envBin && envBin.trim()) {
    list.push(envBin.trim());
  }

  if (Deno.build.os === "windows") {
    list.push(
      "C:/Program Files/WeasyPrint/weasyprint.exe",
      "C:/Program Files (x86)/WeasyPrint/weasyprint.exe",
    );
  } else {
    list.push("/usr/bin/weasyprint", "/usr/local/bin/weasyprint", "weasyprint");
  }

  return list;
}

async function commandWorks(command: string): Promise<boolean> {
  try {
    const proc = new Deno.Command(command, {
      args: ["--version"],
      stdout: "piped",
      stderr: "piped",
    });
    const { success } = await proc.output();
    return success;
  } catch {
    return false;
  }
}

export async function findWeasyPrint(candidates = candidatePaths()): Promise<string | undefined> {
  for (const candidate of candidates) {
    if (await commandWorks(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

export async function logWeasyPrintAvailability(): Promise<void> {
  const candidates = candidatePaths();
  const found = await findWeasyPrint(candidates);
  if (found) {
    console.log(`weasyprint detected at ${found}`);
    return;
  }

  console.error(
    "⚠️  No weasyprint executable detected. " +
      "PDF generation requires weasyprint. " +
      "Set WEASYPRINT_BIN. Checked paths: " +
      candidates.join(", "),
  );
}

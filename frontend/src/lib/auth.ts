import { SESSION_COOKIE } from "./backend";

export function getAuthHeaderFromCookie(cookieString?: string): string | null {
  if (!cookieString) return null;
  const cookies = cookieString.split(";").map((c) => c.trim());
  const header = cookies.find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  if (header) {
    const token = header.split("=")[1];
    return `Bearer ${token}`;
  }
  return null;
}

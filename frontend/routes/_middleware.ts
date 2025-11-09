import { MiddlewareHandlerContext } from "$fresh/server.ts";
import { getAuthHeaderFromCookie, backendGet } from "../utils/backend.ts";
import {
  LocalizationConfig,
  resolveLocalization,
  DEFAULT_LOCALIZATION,
} from "../i18n/mod.ts";

export interface AppState {
  localization: LocalizationConfig;
}

export async function handler(
  req: Request,
  ctx: MiddlewareHandlerContext<AppState>,
) {
  const cookie = req.headers.get("cookie") || undefined;
  const auth = getAuthHeaderFromCookie(cookie);

  if (!auth) {
    ctx.state.localization = DEFAULT_LOCALIZATION;
    return await ctx.next();
  }

  try {
    const settings = await backendGet("/api/v1/settings", auth) as Record<
      string,
      unknown
    >;
    const localization = resolveLocalization(
      settings.locale as string | undefined,
      settings.numberFormat as string | undefined,
      settings.dateFormat as string | undefined,
    );
    ctx.state.localization = localization;
  } catch (_e) {
    ctx.state.localization = DEFAULT_LOCALIZATION;
  }

  return await ctx.next();
}

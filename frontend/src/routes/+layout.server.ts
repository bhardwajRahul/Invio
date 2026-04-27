import type { LayoutServerLoad } from "./$types";
import { getDemoMode } from "$lib/demo";

export const load: LayoutServerLoad = async ({ locals }) => {
  const { t, ...serializableLocalization } = locals.localization;
  const demo = await getDemoMode();

  return {
    user: locals.user,
    localization: serializableLocalization,
    demoMode: demo.demoMode,
    demoResetMinutes: demo.demoResetMinutes,
  };
};

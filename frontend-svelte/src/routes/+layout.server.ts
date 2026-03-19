import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals }) => {
  // Omit the `t` function from serialization since it can't be passed from server to client
  const { t, ...serializableLocalization } = locals.localization;

  return {
    user: locals.user,
    localization: serializableLocalization
  };
};

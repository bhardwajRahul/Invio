import { redirect, fail } from "@sveltejs/kit";
import { backendGet, backendDelete, backendPost } from "$lib/backend";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ locals, params }) => {
  if (!locals.user) {
    throw redirect(303, "/login");
  }

  const hasPerm = locals.user.isAdmin || locals.user.permissions?.some(
    (p: any) => p.resource === "products" && p.action === "read"
  );
  if (!hasPerm) {
    throw redirect(303, "/products");
  }

  try {
    const product = await backendGet(`/api/v1/products/${params.id}`, locals.authHeader);
    const taxDef = product.taxDefinitionId ? await backendGet(`/api/v1/tax-definitions/${product.taxDefinitionId}`, locals.authHeader).catch(() => null) : null;
    const settings = await backendGet("/api/v1/settings", locals.authHeader).catch(() => ({}));

    return {
      product,
      taxDefinition: taxDef,
      settings: settings || {},
      usedInInvoices: false // Just a placeholder, assuming we could check this via api
    };
  } catch (err: any) {
    return {
      error: err.message,
    };
  }
};

export const actions: Actions = {
  delete: async ({ locals, params }) => {
    if (!locals.user) throw redirect(303, "/login");
    try {
      await backendDelete(`/api/v1/products/${params.id}`, locals.authHeader);
    } catch (e: any) {
      if (e && typeof e === 'object' && 'status' in e && 'location' in e) throw e;
      return fail(500, { error: e.message || String(e) });
    }
    throw redirect(303, "/products");
  },
  reactivate: async ({ locals, params }) => {
    if (!locals.user) throw redirect(303, "/login");
    try {
      const p = await backendGet(`/api/v1/products/${params.id}`, locals.authHeader);
      await backendPost(`/api/v1/products/${params.id}`, locals.authHeader, { ...p, isActive: true });
      return { success: true };
    } catch(e: any) {
      return fail(500, { error: e.message || String(e) });
    }
  }
};

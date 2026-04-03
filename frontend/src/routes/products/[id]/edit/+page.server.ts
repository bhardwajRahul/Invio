import { redirect, fail } from "@sveltejs/kit";
import { backendGet, backendPost } from "$lib/backend";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ locals, params }) => {
  if (!locals.user) {
    throw redirect(303, "/login");
  }

  const hasPerm = locals.user.isAdmin || locals.user.permissions?.some(
    (p: any) => p.resource === "products" && p.action === "update"
  );
  if (!hasPerm) {
    throw redirect(303, `/products/${params.id}`);
  }

  try {
    const [product, taxDefinitions, categories, units] = await Promise.all([
      backendGet(`/api/v1/products/${params.id}`, locals.authHeader),
      backendGet("/api/v1/tax-definitions", locals.authHeader),
      backendGet("/api/v1/product-categories", locals.authHeader),
      backendGet("/api/v1/product-units", locals.authHeader),
    ]);

    return {
      product: product,
      taxDefinitions: taxDefinitions || [],
      categories: categories || [],
      units: units || [],
    };
  } catch (err: any) {
    return {
      error: err.message,
    };
  }
};

export const actions: Actions = {
  default: async ({ request, locals, params }) => {
    if (!locals.user) {
      throw redirect(303, "/login");
    }

    const form = await request.formData();
    const name = String(form.get("name") || "");
    const description = String(form.get("description") || "");
    const unitPrice = parseFloat(String(form.get("unitPrice") || "0"));
    const sku = String(form.get("sku") || "");
    const unit = String(form.get("unit") || "");
    const category = String(form.get("category") || "");
    const taxDefinitionId = String(form.get("taxDefinitionId") || "");
    const isActive = form.get("isActive") === "true";

    if (!name) {
      return fail(400, { error: "Name is required" });
    }

    try {
      await backendPost(`/api/v1/products/${params.id}`, locals.authHeader, {
        name,
        description: description || undefined,
        unitPrice,
        sku: sku || undefined,
        unit: unit || undefined,
        category: category || undefined,
        taxDefinitionId: taxDefinitionId || undefined,
        isActive
      });
    } catch (e: any) {
      if (e && typeof e === 'object' && 'status' in e && 'location' in e) throw e;
      return fail(500, { error: e.message || String(e) });
    }
    throw redirect(303, `/products/${params.id}`);
  },
};

import type { PageServerLoad, Actions } from "./$types";
import { backendGet, backendDelete, backendPost } from "$lib/backend";
import { fail, redirect } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ locals }) => {
  const auth = locals.authHeader;
  
  if (!auth) {
    throw redirect(303, "/login");
  }

  // Define fallback defaults
  let demoMode = false;
  let settings = {};
  let templates: {id: string, name: string}[] = [];
  let taxDefinitions = [];
  let productCategories = [];
  let productUnits = [];
  let xmlProfiles = [];
  let error = null;

  try {
    const demoModeRes = await fetch("http://localhost:3000/api/public/demo-mode", { headers: { "Content-Type": "application/json" } });
    if (demoModeRes.ok) {
        demoMode = (await demoModeRes.json()).demoMode || false;
    }
  } catch(err) {
    console.error("demo mode fetch failed", err);
  }

  try {
        const [s, t, tax, pc, pu, xp] = await Promise.all([
          backendGet("/api/v1/settings", auth).catch(() => ({})),
          backendGet("/api/v1/templates", auth).catch(() => []),
          backendGet("/api/v1/tax-definitions", auth).catch(() => []),
          backendGet("/api/v1/product-categories", auth).catch(() => []),
          backendGet("/api/v1/product-units", auth).catch(() => []),
          backendGet("/api/v1/xml-profiles", auth).catch(() => [])
      ]);
      
      settings = s || {};
      templates = t || [];
      taxDefinitions = tax || [];
      productCategories = pc || [];
      productUnits = pu || [];
      xmlProfiles = xp || [];

  } catch(err: any) {
      error = err.message;
  }

  return {
    settings,
    templates,
    taxDefinitions,
    productCategories,
    productUnits,
    xmlProfiles,
    demoMode,
    error,
    hasTemplates: templates.length > 0
  };
};

export const actions: Actions = {
  deleteTemplate: async ({ request, locals, url }) => {
    const data = await request.formData();
    const id = data.get("deleteTemplateId");
    if (!id) return fail(400, { error: "Missing ID" });
    try {
      await backendDelete(`/api/v1/templates/${id}`, locals.authHeader);
    } catch(err) {
      return fail(500, { error: "Failed to delete" });
    }
  },
  updateTemplate: async ({ request, locals }) => {
    const data = await request.formData();
    const id = data.get("updateTemplateId");
    if (!id) return fail(400, { error: "Missing ID" });
    try {
      await backendPost(`/api/v1/templates/${id}/update`, locals.authHeader, {});
    } catch(err) {
      return fail(500, { error: "Failed to update" });
    }
  }
};


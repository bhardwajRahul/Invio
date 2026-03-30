import { redirect } from "@sveltejs/kit";
import { backendGet } from "$lib/backend";

export const load = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(303, "/login");
  }

  const hasPerm = locals.user.isAdmin || locals.user.permissions?.some(
    (p: any) => p.resource === "templates" && p.action === "read"
  );

  if (!hasPerm) {
    throw redirect(303, "/dashboard");
  }

  try {
    const templates = await backendGet("/api/v1/templates", locals.authHeader);
    return {
      templates: templates || []
    };
  } catch (err: any) {
    console.error("Failed to load templates:", err);
    return {
      error: err.message,
      templates: []
    };
  }
};

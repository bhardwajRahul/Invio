import { redirect } from "@sveltejs/kit";
import { backendGet } from "$lib/backend";

export const load = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(303, "/login");
  }

  const hasPerm =
    locals.user.isAdmin ||
    locals.user.permissions?.some(
      (p: any) => p.resource === "customers" && p.action === "read",
    );

  if (!hasPerm) {
    throw redirect(303, "/dashboard");
  }

  try {
    const customers = await backendGet("/api/v1/customers", locals.authHeader);
    return {
      customers: customers || [],
    };
  } catch (err: any) {
    console.error("Failed to load customers:", err);
    return {
      error: err.message,
      customers: [],
    };
  }
};

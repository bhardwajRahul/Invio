import { redirect } from "@sveltejs/kit";
import { backendGet } from "$lib/backend";

export const load = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(303, "/login");
  }

  const hasPerm =
    locals.user.isAdmin ||
    locals.user.permissions?.some(
      (p: any) => p.resource === "products" && p.action === "read",
    );

  if (!hasPerm) {
    throw redirect(303, "/dashboard");
  }

  try {
    const products = await backendGet("/api/v1/products", locals.authHeader);
    return {
      products: products || [],
    };
  } catch (err: any) {
    console.error("Failed to load products:", err);
    return {
      error: err.message,
      products: [],
    };
  }
};

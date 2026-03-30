import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { backendGet, SESSION_COOKIE } from "$lib/backend";

export const load: PageServerLoad = async ({ locals, cookies }) => {
  if (!locals.user) {
    throw redirect(303, "/login");
  }

  const token = cookies.get(SESSION_COOKIE);
  const auth = token ? `Bearer ${token}` : "";

  try {
    const invoices = (await backendGet("/api/v1/invoices", auth)) as any[];
    invoices.sort((a, b) => new Date(b.updatedAt || b.issueDate || 0).getTime() - new Date(a.updatedAt || a.issueDate || 0).getTime());
    return { invoices };
  } catch (err) {
    return { error: String(err), invoices: [] };
  }
};

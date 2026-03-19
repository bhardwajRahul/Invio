import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { SESSION_COOKIE } from "$lib/backend";

export const load: PageServerLoad = async ({ cookies }) => {
  cookies.delete(SESSION_COOKIE, { path: "/" });
  throw redirect(303, "/login");
};

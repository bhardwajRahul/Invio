import { error, redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
  // Just pass the token to the page so it can construct the iframe source
  // No backend communication here, backend serves the actual HTML via iframe!
  return { token: params.token };
};

import { Handlers, PageProps } from "$fresh/server.ts";
import { getAuthHeaderFromCookie } from "../utils/backend.ts";

export const handler: Handlers = {
  GET(req) {
    const auth = getAuthHeaderFromCookie(
      req.headers.get("cookie") || undefined,
    );
    const Location = auth ? "/dashboard" : "/login";
    return new Response(null, { status: 303, headers: { Location } });
  },
};

export default function RedirectPage(_props: PageProps) {
  return null;
}

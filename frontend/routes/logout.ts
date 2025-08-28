import { Handlers } from "$fresh/server.ts";
import { clearAuthCookieHeaders } from "../utils/backend.ts";

export const handler: Handlers = {
  GET() {
    const headers = new Headers({ ...clearAuthCookieHeaders(), Location: "/" });
    return new Response(null, { status: 303, headers });
  },
};

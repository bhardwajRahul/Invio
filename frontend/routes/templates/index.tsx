import { Handlers } from "$fresh/server.ts";
import { getAuthHeaderFromCookie } from "../../utils/backend.ts";

export const handler: Handlers = {
  GET(req) {
    const auth = getAuthHeaderFromCookie(
      req.headers.get("cookie") || undefined,
    );
    if (!auth) {
      return new Response(null, {
        status: 303,
        headers: { Location: "/login" },
      });
    }
    return new Response(null, {
      status: 303,
      headers: { Location: "/settings" },
    });
  },
  POST(req) {
    const auth = getAuthHeaderFromCookie(
      req.headers.get("cookie") || undefined,
    );
    if (!auth) {
      return new Response(null, {
        status: 303,
        headers: { Location: "/login" },
      });
    }
    return new Response(null, {
      status: 303,
      headers: { Location: "/settings" },
    });
  },
};

export default function Redirect() {
  return null;
}

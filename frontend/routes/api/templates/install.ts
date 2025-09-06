import { Handlers } from "$fresh/server.ts";
import { backendPost, getAuthHeaderFromCookie } from "../../../utils/backend.ts";

export const handler: Handlers = {
  async POST(req) {
    try {
      const auth = getAuthHeaderFromCookie(req.headers.get("cookie") || undefined);
      if (!auth) return new Response("Unauthorized", { status: 401 });
      const { url } = await req.json().catch(() => ({}));
      if (!url || typeof url !== "string") {
        return new Response(JSON.stringify({ error: "Missing 'url'" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      const data = await backendPost("/api/v1/templates/install-from-manifest", auth, { url });
      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};

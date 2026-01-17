import { Handlers } from "$fresh/server.ts";
import { proxyRequest } from "../../../utils/backend.ts";

function fullPath(req: Request) {
  const u = new URL(req.url);
  return u.pathname + u.search;
}

export const handler: Handlers = {
  async GET(req) {
    return await proxyRequest(req, fullPath(req));
  },
  async POST(req) {
    return await proxyRequest(req, fullPath(req));
  },
  async PUT(req) {
    return await proxyRequest(req, fullPath(req));
  },
  async PATCH(req) {
    return await proxyRequest(req, fullPath(req));
  },
  async DELETE(req) {
    return await proxyRequest(req, fullPath(req));
  },
  async OPTIONS(req) {
    return await proxyRequest(req, fullPath(req));
  },
};

import { Hono } from "hono";

export const cors = () => {
  return new Hono()
    .use("*", async (c, next) => {
      c.header("Access-Control-Allow-Origin", "*");
      c.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      
      if (c.req.method === "OPTIONS") {
        return c.text("", 204);
      }
      
      await next();
    });
};

export default cors;
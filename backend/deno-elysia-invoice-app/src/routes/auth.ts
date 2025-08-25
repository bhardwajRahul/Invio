import { Router } from "elysia";
import { BasicAuth, generateJWT } from "../middleware/auth.ts";

const authRouter = new Router();

authRouter.post("/login", BasicAuth, async (ctx) => {
  const { user } = ctx.state;
  const token = generateJWT(user);
  ctx.json({ token });
});

export default authRouter;
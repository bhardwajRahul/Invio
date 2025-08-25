import { RouterContext } from "https://deno.land/x/elysia/mod.ts";
import { Setting } from "../models/setting.ts";

export const getSettings = async (ctx: RouterContext) => {
  const settings = await Setting.findAll();
  ctx.response.body = settings;
};

export const updateSettings = async (ctx: RouterContext) => {
  const { key, value } = await ctx.request.body().value;
  const setting = await Setting.update(key, value);
  
  if (setting) {
    ctx.response.body = { message: "Setting updated successfully." };
  } else {
    ctx.response.status = 404;
    ctx.response.body = { message: "Setting not found." };
  }
};
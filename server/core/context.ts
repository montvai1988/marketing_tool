import { parse } from "cookie";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getUserByOpenId } from "../db";
import { COOKIE_NAME, readSession } from "./session";

export type TrpcContext = { req: CreateExpressContextOptions["req"]; res: CreateExpressContextOptions["res"]; user: User | null };

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  const cookies = parse(opts.req.headers.cookie ?? "");
  const session = await readSession(cookies[COOKIE_NAME]);
  const user = session ? (await getUserByOpenId(session.openId)) ?? null : null;
  return { req: opts.req, res: opts.res, user };
}

import crypto from "node:crypto";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { z } from "zod";
import { appRouter } from "./routers";
import { createContext } from "./core/context";
import { ENV, requireEnv } from "./core/env";
import { COOKIE_NAME, createSession, getSessionCookieOptions } from "./core/session";
import { getUserByOpenId, upsertUser } from "./db";

const LOCAL_OWNER_ID = "local-owner";
const equal = (left: string, right: string) => {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
async function ensureLocalOwner() {
  const current = await getUserByOpenId(LOCAL_OWNER_ID);
  if (current) return current;
  await upsertUser({ openId: LOCAL_OWNER_ID, name: ENV.ownerName, email: ENV.ownerEmail, loginMethod: "password", role: "admin" });
  const created = await getUserByOpenId(LOCAL_OWNER_ID);
  if (!created) throw new Error("Az admin felhasználó létrehozása nem sikerült. Ellenőrizd a DATABASE_URL értékét.");
  return created;
}
export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "2mb" }));
  app.get("/api/health", (_req, res) => res.status(200).json({ ok: true }));
  app.post("/api/auth/login", async (req, res) => {
    const parsed = z.object({ username: z.string().min(1).max(120), password: z.string().min(1).max(500) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Érvénytelen belépési adatok." });
    const password = requireEnv(ENV.appPassword, "APP_PASSWORD");
    if (parsed.data.username.trim().toLowerCase() !== ENV.appUsername.toLowerCase() || !equal(parsed.data.password, password)) return res.status(401).json({ error: "Hibás felhasználónév vagy jelszó." });
    try {
      await ensureLocalOwner();
      res.cookie(COOKIE_NAME, await createSession(LOCAL_OWNER_ID), getSessionCookieOptions(req));
      return res.status(200).json({ success: true });
    } catch (error) { return res.status(503).json({ error: error instanceof Error ? error.message : "A belépés nem sikerült." }); }
  });
  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(req), maxAge: -1 });
    res.status(200).json({ success: true });
  });
  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  return app;
}

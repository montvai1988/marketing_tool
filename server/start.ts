import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import express from "express";
import { createServer as createViteServer } from "vite";
import { createApp } from "./app";

async function start() {
  const app = createApp();
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      try {
        const template = await fs.readFile(path.resolve("client/index.html"), "utf-8");
        res.status(200).set({ "Content-Type": "text/html" }).end(await vite.transformIndexHtml(req.originalUrl, template));
      } catch (error) { vite.ssrFixStacktrace(error as Error); next(error); }
    });
  } else {
    const dist = path.resolve("dist");
    app.use(express.static(dist));
    app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
  }
  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, () => console.log(`Marketing Prospect Hub listening on http://localhost:${port}`));
}
void start();

import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./core/session";
import { publicProcedure, router } from "./core/trpc";
import { outreachRouter } from "./routers/outreach";
import { publicRouter } from "./routers/public";

export const appRouter = router({
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  outreach: outreachRouter,
  public: publicRouter,
});

export type AppRouter = typeof appRouter;

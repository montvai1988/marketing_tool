import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { optOuts, prospects } from "../../drizzle/schema";
import { normalizeEmail } from "../../shared/prospects";
import { publicProcedure, router } from "../core/trpc";
import { getDb } from "../db";

/**
 * Unauthenticated endpoints reachable from the footer of a sent email. The
 * address is suppressed for every owner that holds it, so an unsubscribe can
 * never be bypassed by re-importing the same contact.
 */
export const publicRouter = router({
  unsubscribe: publicProcedure
    .input(z.object({ email: z.string().email().max(320) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false as const };

      const email = normalizeEmail(input.email);
      const owners = await db
        .select({ ownerId: prospects.ownerId })
        .from(prospects)
        .where(eq(prospects.email, email));

      const ownerIds = Array.from(new Set(owners.map(row => row.ownerId)));

      for (const ownerId of ownerIds) {
        await db
          .insert(optOuts)
          .values({ ownerId, email, reason: "unsubscribed" })
          .onConflictDoUpdate({
            target: [optOuts.ownerId, optOuts.email],
            set: { reason: "unsubscribed" },
          });

        await db
          .update(prospects)
          .set({ optedOut: true, optedOutAt: new Date() })
          .where(and(eq(prospects.ownerId, ownerId), eq(prospects.email, email)));
      }

      return { success: true as const, matched: ownerIds.length };
    }),
});

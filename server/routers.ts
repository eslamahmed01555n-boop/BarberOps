import { z } from "zod";
import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { addWalkIn, assignWalkIn, getDashboard, resetDemo, updateBooking, type BookingAction } from "./barber-store";

const bookingActionSchema = z.enum(["confirm", "arrived", "start", "complete", "extend", "delay", "no_show", "cancel", "reschedule"]);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  dashboard: router({
    snapshot: publicProcedure.query(() => getDashboard()),
    updateBooking: publicProcedure
      .input(z.object({ bookingId: z.string().min(1), action: bookingActionSchema }))
      .mutation(({ input }) => updateBooking(input.bookingId, input.action as BookingAction)),
    resetDemo: publicProcedure.mutation(() => resetDemo()),
  }),
  walkIns: router({
    add: publicProcedure
      .input(z.object({ customerName: z.string().min(2), phone: z.string().min(5), service: z.string().min(2), barberPreference: z.string().optional() }))
      .mutation(({ input }) => addWalkIn(input)),
    assign: publicProcedure
      .input(z.object({ queueId: z.string().min(1), barberId: z.string().min(1) }))
      .mutation(({ input }) => assignWalkIn(input.queueId, input.barberId)),
  }),
});

export type AppRouter = typeof appRouter;

/**
 * instrumentation.ts
 * Next.js server instrumentation — runs once when the Node.js server starts.
 * Used to boot the cron scheduler so scheduled jobs survive hot reloads.
 *
 * Enable in next.config.js via: experimental.instrumentationHook = true
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initScheduler } = await import("./services/scheduler");
    await initScheduler();
  }
}

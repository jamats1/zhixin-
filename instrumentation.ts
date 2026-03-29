/**
 * Runs once when the Next.js server starts.
 * Logs uncaught errors so "exiting when loading page" shows a reason in the terminal.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.on("uncaughtException", (err) => {
      console.error("[instrumentation] uncaughtException:", err);
    });
    process.on("unhandledRejection", (reason, promise) => {
      console.error("[instrumentation] unhandledRejection:", reason, promise);
    });
  }
}

import { processQueueOnce } from "@/lib/queueWorker";

declare global {
  // eslint-disable-next-line no-var
  var __pollerStarted: boolean | undefined;
}

export function startQueuePoller() {
  if (global.__pollerStarted) return;
  global.__pollerStarted = true;

  console.log("🟢 Queue poller started");

  setInterval(async () => {
    try {
      const res = await processQueueOnce();
      if (res.processed > 0) {
        console.log("🔄 Queue processed:", res.processed);
      }
    } catch (e) {
      console.error("🔴 Queue poller error:", e);
    }
  }, 2000);
}

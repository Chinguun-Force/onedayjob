import { processQueueOnce } from "@/lib/queueWorker";

export async function POST() {
  const result = await processQueueOnce();
  return Response.json(result);
}

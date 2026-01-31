import { prisma } from "@/lib/prisma";

const MAX_ATTEMPTS = 3;

  const SOCKET_SERVER_URL = process.env.SOCKET_SERVER_URL ?? "http://localhost:4000";
const SOCKET_INTERNAL_TOKEN = process.env.SOCKET_INTERNAL_TOKEN ?? "dev-token";
async function deliverInApp(notificationId: string) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    include: {
      recipients: { select: { userId: true } },
    },
  });

  if (!notification) return { ok: false, error: "Notification not found" };

  // хэрэгтэй payload (чи хүссэнээрээ өргөжүүлж болно)
  const payload = {
    id: notification.id,
    type: notification.type,
    createdAt: notification.createdAt,
  };

  // recipient бүр дээр socket server руу HTTP notify
  for (const r of notification.recipients) {
    const resp = await fetch(`${SOCKET_SERVER_URL}/internal/notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SOCKET_INTERNAL_TOKEN}`,
      },
      body: JSON.stringify({ userId: r.userId, payload }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return { ok: false, error: `notify failed: ${resp.status} ${text}` };
    }
  }

  return { ok: true };
}

export async function processQueueOnce() {
  const job = await prisma.$transaction(async (tx) => {
    const next = await tx.queueJob.findFirst({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
    });
    if (!next) return null;

    const updated = await tx.queueJob.updateMany({
      where: { id: next.id, status: "PENDING" },
      data: { status: "PROCESSING" },
    });

    if (updated.count === 0) return null;
    return next;
  });

  if (!job) return { processed: 0 };

  try {
    // 1) DB дээр delivery тэмдэглэнэ + job DONE болгоно (transaction)
    await prisma.$transaction([
      prisma.notificationRecipient.updateMany({
        where: { notificationId: job.notificationId, deliveredAt: null },
        data: { deliveredAt: new Date() },
      }),
      prisma.queueJob.update({
        where: { id: job.id },
        data: { status: "DONE" },
      }),
    ]);

    // 2) Transaction дууссаны ДАРАА socket emit хийнэ
    const res = await deliverInApp(job.notificationId);

if (res.ok) {
  await prisma.$transaction([
    prisma.notificationRecipient.updateMany({
      where: { notificationId: job.notificationId, deliveredAt: null },
      data: { deliveredAt: new Date() },
    }),
    prisma.queueJob.update({
      where: { id: job.id },
      data: { status: "DONE" },
    }),
  ]);

  return { processed: 1 };
}
  } catch (e: any) {
    const nextAttempts = job.attempts + 1;
    const isFinal = nextAttempts >= MAX_ATTEMPTS;

    await prisma.queueJob.update({
      where: { id: job.id },
      data: {
        attempts: nextAttempts,
        lastError: e?.message ?? "Unknown error",
        status: isFinal ? "FAILED" : "PENDING",
      },
    });

    return { processed: 1 };
  }
}

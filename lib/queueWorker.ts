import { prisma } from "@/lib/prisma";

const MAX_ATTEMPTS = 3;


async function deliverInApp(notificationId: string) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    include: { recipients: { select: { userId: true } } },
  });

  if (!notification) {
    return { ok: false as const, error: "Notification not found" };
  }

  for (const r of notification.recipients) {
    global._io?.to(`user:${r.userId}`).emit("notification", {
  id: notification.id,
  type: notification.type,
  createdAt: notification.createdAt,
  title: notification.type === "PROFILE_UPDATED"
    ? "Profile updated"
    : "New employee added",
});
  }

  return { ok: true as const };
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
    if (!res.ok) {
      // emit талдаа алдаа гарвал job-г DONE хэвээр үлдээж болно (demo дээр ok)
      console.warn("deliverInApp failed:", res.error);
    }

    return { processed: 1 };
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

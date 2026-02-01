import { prisma } from "@/lib/prisma";

export async function ensureTemplates() {
  await prisma.notificationTemplate.upsert({
    where: { type: "ANNOUNCEMENT" as any },
    update: {},
    create: {
      type: "ANNOUNCEMENT" as any,
      title: "📢 {{title}}",
      body: "{{message}}\n\n{{date}}",
    },
  });

  await prisma.notificationTemplate.upsert({
    where: { type: "NEW_EMPLOYEE_ADDED" as any },
    update: {},
    create: {
      type: "NEW_EMPLOYEE_ADDED" as any,
      title: "👋 New employee joined",
      body: "{{email}} ажилд орлоо. Огноо: {{date}}",
    },
  });
}
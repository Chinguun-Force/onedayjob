import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "./guards";
import { GraphQLJSON } from "graphql-scalars";

const resolvers = {
  JSON: GraphQLJSON,
  Query: {
    me: async (_: any, __: any, ctx: any) => {
      return ctx.session?.user ?? null;
    },

    users: async (_: any, __: any, ctx: any) => {
      requireAdmin(ctx);

      return prisma.user.findMany({
        select: { id: true, email: true, name: true, role: true },
        orderBy: { createdAt: "desc" },
      });
    },

    templates: async (_: any, __: any, ctx: any) => {
      requireAdmin(ctx);

      return prisma.notificationTemplate.findMany({
        orderBy: { updatedAt: "desc" },
      });
    },

    template: async (_: any, args: { type: string }, ctx: any) => {
      requireAdmin(ctx);

      return prisma.notificationTemplate.findUnique({
        where: { type: args.type as any },
      });
    },
    myNotifications: async (_: any, __: any, ctx: any) => {
    const user = requireUser(ctx);

    return prisma.notificationRecipient.findMany({
      where: { userId: (user as any).id },
      orderBy: { createdAt: "desc" },
      include: {
        notification: true,
      },
    });
  },
  },

  Mutation: {
    upsertTemplate: async (
      _: any,
      args: { input: { type: string; title: string; body: string } },
      ctx: any
    ) => {
      requireAdmin(ctx);

      const { type, title, body } = args.input;

      return prisma.notificationTemplate.upsert({
        where: { type: type as any },
        update: { title, body },
        create: { type: type as any, title, body },
      });
    },

    deleteTemplate: async (_: any, args: { type: string }, ctx: any) => {
      requireAdmin(ctx);

      await prisma.notificationTemplate.delete({
        where: { type: args.type as any },
      });

      return true;
    },
    sendNotification: async (
    _: any,
    args: { input: { type: any; targetRole: any; payload?: any } },
    ctx: any
  ) => {
    const admin = requireAdmin(ctx);

    const { type, targetRole, payload } = args.input;

    // 1) template
    const template = await prisma.notificationTemplate.findUnique({
      where: { type },
    });
    if (!template) throw new Error("Template not found");

    // 2) users by role
    const users = await prisma.user.findMany({
      where: { role: targetRole },
      select: { id: true },
    });

    if (users.length === 0) return true;

    // 3) notification + recipients
    const notification = await prisma.notification.create({
      data: {
        type,
        channel: "IN_APP",
        payloadJson: payload ?? null,
        createdById: (admin as any).id,
        recipients: {
          create: users.map((u) => ({
            userId: u.id,
            status: "UNREAD",
          })),
        },
      },
    });

    // 4) queue job (demo)
    await prisma.queueJob.create({
      data: {
        notificationId: notification.id,
        status: "PENDING",
      },
    });

    return true;
  },

  markRead: async (_: any, args: { recipientId: string }, ctx: any) => {
    const user = requireUser(ctx);

    const row = await prisma.notificationRecipient.findUnique({
      where: { id: args.recipientId },
    });

    if (!row || row.userId !== (user as any).id) {
      throw new Error("Forbidden");
    }

    await prisma.notificationRecipient.update({
      where: { id: args.recipientId },
      data: {
        status: "READ",
        readAt: new Date(),
      },
    });

    return true;
  },

  markAllRead: async (_: any, __: any, ctx: any) => {
    const user = requireUser(ctx);

    const res = await prisma.notificationRecipient.updateMany({
      where: {
        userId: (user as any).id,
        status: "UNREAD",
      },
      data: {
        status: "READ",
        readAt: new Date(),
      },
    });

    return res.count;
  },
  },
};

export default resolvers;

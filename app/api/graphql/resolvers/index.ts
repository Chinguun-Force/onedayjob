import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "./guards";
import { GraphQLJSON } from "graphql-scalars";
import { NotificationType } from "@prisma/client";
import bcrypt from "bcryptjs";

const OTP_PASSWORD = "111111";

const resolvers = {
  JSON: GraphQLJSON,

  Query: {
    me: async (_: any, __: any, ctx: any) => {
      const user = ctx.session?.user;
      if (!user?.id) return null;

      return prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          mustChangePassword: true,
          passwordChangedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    },

    users: async (_: any, __: any, ctx: any) => {
      requireAdmin(ctx);
      return prisma.user.findMany({
        select: { id: true, email: true, name: true, role: true },
        orderBy: { createdAt: "desc" },
      });
    },

    adminUsers: async (_: any, __: any, ctx: any) => {
      requireAdmin(ctx);
      return prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          mustChangePassword: true,
          createdAt: true,
        },
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
      const user = requireUser(ctx) as any;
      return prisma.notificationRecipient.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        include: { notification: true },
      });
    },
    canSignupAdmin: async () => {
    const adminCount = await prisma.user.count({
      where: { role: "ADMIN" },
    });

    return adminCount === 0;
    }
  },

  Mutation: {
    upsertTemplate: async (
    _: any,
    args: { input: { type: NotificationType; title: string; body: string } },
    ctx: any
  ) => {
    requireAdmin(ctx);
    const { type, title, body } = args.input;

    return prisma.notificationTemplate.upsert({
      where: { type },
      update: { title, body },
      create: { type, title, body },
    });
    },

    deleteTemplate: async (
      _: any,
      args: { type: NotificationType },
      ctx: any
    ) => {
      requireAdmin(ctx);

    await prisma.notificationTemplate.delete({
      where: { type: args.type },
    });

    return true;
    },

    sendNotification: async (_: any, args: { input: { type: any; targetRole: any; payload?: any } }, ctx: any) => {
      const admin = requireAdmin(ctx) as any;
      const { type, targetRole, payload } = args.input;

      const template = await prisma.notificationTemplate.findUnique({ where: { type } });
      if (!template) throw new Error("Template not found");

      const ids = payload?.userIds as string[] | undefined;

      const users = ids?.length
        ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true } })
        : await prisma.user.findMany({ where: { role: targetRole }, select: { id: true } });

      if (users.length === 0) return true;

      const notification = await prisma.notification.create({
        data: {
          type,
          channel: "IN_APP",
          payloadJson: payload ?? null,
          createdById: admin.id,
          recipients: {
            create: users.map((u) => ({ userId: u.id, status: "UNREAD" })),
          },
        },
      });

      await prisma.queueJob.create({
        data: { notificationId: notification.id, status: "PENDING" },
      });

      return true;
    },

    markRead: async (_: any, args: { recipientId: string }, ctx: any) => {
      const user = requireUser(ctx) as any;

      const row = await prisma.notificationRecipient.findUnique({
        where: { id: args.recipientId },
      });

      if (!row || row.userId !== user.id) throw new Error("Forbidden");

      await prisma.notificationRecipient.update({
        where: { id: args.recipientId },
        data: { status: "READ", readAt: new Date() },
      });

      return true;
    },

    markAllRead: async (_: any, __: any, ctx: any) => {
      const user = requireUser(ctx) as any;

      const res = await prisma.notificationRecipient.updateMany({
        where: { userId: user.id, status: "UNREAD" },
        data: { status: "READ", readAt: new Date() },
      });

      return res.count;
    },

    createUser: async (_: any, args: { input: { email: string; role: "ADMIN" | "EMPLOYEE" } }, ctx: any) => {
      requireAdmin(ctx);
      const hash = await bcrypt.hash(OTP_PASSWORD, 10);

      return prisma.user.create({
        data: {
          email: args.input.email,
          role: args.input.role as any,
          passwordHash: hash,
          mustChangePassword: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          mustChangePassword: true,
          createdAt: true,
        },
      });
    },

    resetUserPassword: async (_: any, args: { userId: string }, ctx: any) => {
      requireAdmin(ctx);
      const hash = await bcrypt.hash(OTP_PASSWORD, 10);

      await prisma.user.update({
        where: { id: args.userId },
        data: { passwordHash: hash, mustChangePassword: true },
      });

      return true;
    },

    forceResetPassword: async (_: any, args: { userId: string }, ctx: any) => {
      requireAdmin(ctx);
      const otpHash = await bcrypt.hash(OTP_PASSWORD, 10);

      await prisma.user.update({
        where: { id: args.userId },
        data: { passwordHash: otpHash, mustChangePassword: true },
      });

      return true;
    },
    changeMyPassword: async (_: any, args: { oldPassword: string; newPassword: string }, ctx: any) => {
      const user = requireUser(ctx) as any;

      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { passwordHash: true },
      });
      if (!dbUser) throw new Error("User not found");

      const ok = await bcrypt.compare(args.oldPassword, dbUser.passwordHash);
      if (!ok) throw new Error("Wrong password");

      if (args.newPassword.length < 8) throw new Error("Password must be at least 8 characters");

      const newHash = await bcrypt.hash(args.newPassword, 10);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newHash,
          mustChangePassword: false,
          passwordChangedAt: new Date(),
        },
      });

      return true;
    },
    bootstrapAdminSignup: async (
  _: any,
  args: { email: string; password: string },
) => {
  const adminCount = await prisma.user.count({
    where: { role: "ADMIN" },
  });

  if (adminCount > 0) {
    throw new Error("Admin already exists");
  }

  if (args.password.length < 8) {
    throw new Error("Password too short");
  }

  const hash = await bcrypt.hash(args.password, 10);

  await prisma.user.create({
    data: {
      email: args.email,
      passwordHash: hash,
      role: "ADMIN",
      mustChangePassword: false,
    },
  });

  return true;
}
  },
};

export default resolvers;

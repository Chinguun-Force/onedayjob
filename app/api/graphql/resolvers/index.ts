import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "./guards";
import { GraphQLJSON } from "graphql-scalars";
import { NotificationType } from "@prisma/client";
import bcrypt from "bcryptjs";

const DEFAULT_OTP = "111111";

/**
 * Helper to send socket events via internal API
 */
async function sendSocketEvent(path: "emit" | "emit-room", body: object) {
  const socketUrl = process.env.SOCKET_SERVER_URL;
  const secret = process.env.SOCKET_SERVER_SECRET;

  if (!socketUrl || !secret) return;

  try {
    await fetch(`${socketUrl}/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    // Silent catch for socket errors
  }
}

const resolvers = {
  JSON: GraphQLJSON,

  Query: {
    me: async (_root: any, _args: any, context: any) => {
      const sessionUser = context.session?.user;
      if (!sessionUser?.id) return null;

      return prisma.user.findUnique({
        where: { id: sessionUser.id },
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

    users: async (_root: any, _args: any, context: any) => {
      requireAdmin(context);
      return prisma.user.findMany({
        select: { id: true, email: true, name: true, role: true },
        orderBy: { createdAt: "desc" },
      });
    },

    adminUsers: async (_root: any, _args: any, context: any) => {
      requireAdmin(context);
      return prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          mustChangePassword: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });
    },

    templates: async (_root: any, _args: any, context: any) => {
      requireAdmin(context);
      return prisma.notificationTemplate.findMany({
        orderBy: { updatedAt: "desc" },
      });
    },

    template: async (_root: any, { type }: { type: NotificationType }, context: any) => {
      requireAdmin(context);
      return prisma.notificationTemplate.findUnique({
        where: { type },
      });
    },

    myNotifications: async (_root: any, _args: any, context: any) => {
      const user = requireUser(context);
      return prisma.notificationRecipient.findMany({
        where: { userId: user.id },
        include: { notification: true },
        orderBy: { createdAt: "desc" },
      });
    },

    canSignupAdmin: async () => {
      const adminCount = await prisma.user.count({
        where: { role: "ADMIN" },
      });
      return adminCount === 0;
    },
  },

  Mutation: {
    upsertTemplate: async (
      _root: any,
      { input }: { input: { type: NotificationType; title: string; body: string } },
      context: any
    ) => {
      requireAdmin(context);
      const { type, title, body } = input;

      return prisma.notificationTemplate.upsert({
        where: { type },
        update: { title, body },
        create: { type, title, body },
      });
    },

    deleteTemplate: async (
      _root: any,
      { type }: { type: NotificationType },
      context: any
    ) => {
      requireAdmin(context);
      await prisma.notificationTemplate.delete({ where: { type } });
      return true;
    },

    sendNotification: async (
      _root: any,
      { input }: { input: { type: NotificationType; targetRole: string; payload?: any } },
      context: any
    ) => {
      const admin = requireAdmin(context);
      const { type, targetRole, payload } = input;

      const template = await prisma.notificationTemplate.findUnique({ where: { type } });
      if (!template) throw new Error("Template not found");

      const specificUserIds = payload?.userIds as string[] | undefined;
      
      const users = specificUserIds?.length
        ? await prisma.user.findMany({ where: { id: { in: specificUserIds } }, select: { id: true } })
        : await prisma.user.findMany({ where: { role: targetRole as any }, select: { id: true } });

      if (users.length === 0) return true;

      const notification = await prisma.notification.create({
        data: {
          type,
          channel: "IN_APP",
          payloadJson: payload ?? null,
          createdById: admin.id,
          recipients: {
            create: users.map((user: any) => ({ userId: user.id, status: "UNREAD" })),
          },
        },
        select: { id: true },
      });

      await prisma.queueJob.create({
        data: { notificationId: notification.id, status: "PENDING" },
      });

      const messagePayload = {
        type,
        title: template.title,
        message: template.body,
        payload: payload ?? null,
        notificationId: notification.id,
        createdAt: new Date().toISOString(),
      };

      if (type === "ANNOUNCEMENT" && targetRole === "EMPLOYEE" && !specificUserIds?.length) {
        await sendSocketEvent("emit-room", { room: "role:EMPLOYEE", event: "notification:new", payload: messagePayload });
      } else {
        await Promise.all(
          users.map((user: any) => 
            sendSocketEvent("emit", { userId: user.id, event: "notification:new", payload: messagePayload })
          )
        );
      }

      return true;
    },

    markRead: async (_root: any, { recipientId }: { recipientId: string }, context: any) => {
      const user = requireUser(context);

      const recipient = await prisma.notificationRecipient.findUnique({
        where: { id: recipientId },
      });

      if (!recipient || recipient.userId !== user.id) {
        throw new Error("Access denied");
      }

      await prisma.notificationRecipient.update({
        where: { id: recipientId },
        data: { status: "READ", readAt: new Date() },
      });

      return true;
    },

    markAllRead: async (_root: any, _args: any, context: any) => {
      const user = requireUser(context);

      const result = await prisma.notificationRecipient.updateMany({
        where: { userId: user.id, status: "UNREAD" },
        data: { status: "READ", readAt: new Date() },
      });

      return result.count;
    },

    createUser: async (
      _root: any,
      { input }: { input: { email: string; role: "ADMIN" | "EMPLOYEE" } },
      context: any
    ) => {
      requireAdmin(context);
      const hash = await bcrypt.hash(DEFAULT_OTP, 10);
      
      const user = await prisma.user.create({
        data: {
          email: input.email,
          role: input.role,
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

      if (user.role === "EMPLOYEE") {
        await sendSocketEvent("emit", {
          userId: user.id,
          event: "notification:new",
          payload: {
            type: "NEW_EMPLOYEE_ADDED",
            title: "Welcome onboard",
            message: "Your account has been created successfully.",
          },
        });
      }

      return user;
    },

    resetUserPassword: async (_root: any, { userId }: { userId: string }, context: any) => {
      requireAdmin(context);
      const hash = await bcrypt.hash(DEFAULT_OTP, 10);

      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: hash, mustChangePassword: true },
      });

      return true;
    },

    forceResetPassword: async (_root: any, { userId }: { userId: string }, context: any) => {
      requireAdmin(context);
      const hash = await bcrypt.hash(DEFAULT_OTP, 10);

      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: hash, mustChangePassword: true },
      });

      return true;
    },

    changeMyPassword: async (
      _root: any,
      { oldPassword, newPassword }: { oldPassword: string; newPassword: string },
      context: any
    ) => {
      const user = requireUser(context);

      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { passwordHash: true },
      });

      if (!dbUser) throw new Error("User not found");

      const isMatch = await bcrypt.compare(oldPassword, dbUser.passwordHash);
      if (!isMatch) throw new Error("Incorrect current password");

      if (newPassword.length < 8) throw new Error("New password too short");

      const newHash = await bcrypt.hash(newPassword, 10);

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
      _root: any,
      { email, password }: { email: string; password: string }
    ) => {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount > 0) throw new Error("Admin already exists");

      if (password.length < 8) throw new Error("Password too short");

      const hash = await bcrypt.hash(password, 10);

      await prisma.user.create({
        data: {
          email,
          passwordHash: hash,
          role: "ADMIN",
          mustChangePassword: false,
        },
      });

      return true;
    },
  },
};

export default resolvers;

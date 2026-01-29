import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./guards";
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
  },
};

export default resolvers;

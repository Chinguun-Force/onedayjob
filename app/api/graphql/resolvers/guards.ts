export function requireAuth(ctx: any) {
  const user = ctx.session?.user;
  if (!user) throw new Error("Not authenticated");
  return user;
}

export function requireAdmin(ctx: any) {
  const user = requireAuth(ctx);
  if ((user as any).role !== "ADMIN") throw new Error("ADMIN only");
  return user;
}

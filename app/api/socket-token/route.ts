import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import jwt from "jsonwebtoken";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = jwt.sign(
    {
      userId: session.user.id,
      role: (session.user as any).role,
    },
    process.env.JWT_SECRET!,
    { expiresIn: "10m" }
  );

  return NextResponse.json({ token });
}

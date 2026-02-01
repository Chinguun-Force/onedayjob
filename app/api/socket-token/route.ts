import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import jwt from "jsonwebtoken";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  const secret = process.env.JWT_SECRET;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!secret) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const token = jwt.sign(
    {
      userId: session.user.id,
      role: session.user.role,
    },
    secret,
    { expiresIn: "10m" }
  );

  return NextResponse.json({ token });
}

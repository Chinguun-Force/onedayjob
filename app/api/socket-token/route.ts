import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import jwt from "jsonwebtoken";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!process.env.JWT_SECRET) {
    return NextResponse.json({ error: "JWT_SECRET is missing" }, { status: 500 });
  }

  const token = jwt.sign(
    {
      userId: session.user.id,
      role: (session.user as any).role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "10m" }
  );

  return NextResponse.json({ token });
}

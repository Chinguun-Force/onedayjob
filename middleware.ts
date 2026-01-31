import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = ["/auth/signin"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1) Static / API-г middleware-ээр оролдохгүй
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // 2) Нэвтрээгүй бол зөвхөн login руу
  if (!token) {
    if (isPublic(pathname)) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = "/auth/signin";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // token доторх user info
  const role = (token as any)?.role ?? (token as any)?.user?.role;
  const mustChangePassword =
    (token as any)?.mustChangePassword ?? (token as any)?.user?.mustChangePassword;

  // 3) mustChangePassword=true бол зөвхөн /change-password руу явна
  if (mustChangePassword) {
    if (pathname !== "/change-password") {
      const url = req.nextUrl.clone();
      url.pathname = "/change-password";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // 4) mustChangePassword=false болсон үед /change-password руу оруулахгүй
  if (pathname === "/change-password") {
    const url = req.nextUrl.clone();
    url.pathname = role === "ADMIN" ? "/admin" : "/employee";
    return NextResponse.redirect(url);
  }

  // 5) Role-based хамгаалалт
  if (pathname.startsWith("/admin")) {
    if (role !== "ADMIN") {
      const url = req.nextUrl.clone();
      url.pathname = "/employee";
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith("/employee")) {
    if (role !== "EMPLOYEE" && role !== "ADMIN") {
      const url = req.nextUrl.clone();
      url.pathname = "/auth/signin";
      return NextResponse.redirect(url);
    }
  }

  // 6) Root дээр default redirect
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = role === "ADMIN" ? "/admin" : "/employee";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
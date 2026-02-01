import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = ["/auth/signin"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function redirect(req: NextRequest, pathname: string) {
  const url = req.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip internal/static
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // ✅ IMPORTANT: secret заавал дамжуул
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Not signed in -> allow public only
  if (!token) {
    if (isPublicPath(pathname)) return NextResponse.next();

    const url = req.nextUrl.clone();
    url.pathname = "/auth/signin";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // ✅ role, mustChangePassword-г олон хувилбараар уншина
  const role =
    (token as any)?.role ??
    (token as any)?.user?.role ??
    (token as any)?.session?.user?.role;

  const mustChangePassword =
    (token as any)?.mustChangePassword ??
    (token as any)?.user?.mustChangePassword ??
    false;

  // ✅ Role уншигдахгүй бол cookie/secret mismatch гэсэн үг. Safe-ээр signin руу
  if (!role) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/signin";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Force password change
  if (mustChangePassword) {
    if (pathname !== "/change-password") return redirect(req, "/change-password");
    return NextResponse.next();
  }

  // If password change not required, block change-password
  if (pathname === "/change-password") {
    return redirect(req, role === "ADMIN" ? "/admin" : "/employee");
  }

  // Root -> role home
  if (pathname === "/") {
    return redirect(req, role === "ADMIN" ? "/admin" : "/employee");
  }

  // -------------------------------
  // Strict role routing (UX fix)
  // -------------------------------
  if (role === "ADMIN" && pathname.startsWith("/employee")) {
    return redirect(req, "/admin");
  }

  if (role === "EMPLOYEE" && pathname.startsWith("/admin")) {
    return redirect(req, "/employee");
  }

  // -------------------------------
  // Authorization guards (strict)
  // -------------------------------
  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return redirect(req, "/employee");
  }

  if (pathname.startsWith("/employee") && role !== "EMPLOYEE") {
    return redirect(req, "/auth/signin");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

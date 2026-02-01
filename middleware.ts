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

  // ✅ санал: secret-ээ авчих (edge дээр асуудал багасна)
  const token = await getToken({ req });

  // ✅ DEBUG header (next response дээр)
  const okRes = NextResponse.next();
  okRes.headers.set("x-has-token", token ? "1" : "0");
  okRes.headers.set("x-path", pathname);

  // 2) Нэвтрээгүй бол зөвхөн login руу
  if (!token) {
    if (isPublic(pathname)) return okRes;

    const url = req.nextUrl.clone();
    url.pathname = "/auth/signin";
    url.searchParams.set("next", pathname);

    const red = NextResponse.redirect(url);
    red.headers.set("x-has-token", "0");
    red.headers.set("x-path", pathname);
    return red;
  }

  const role = (token as any)?.role ?? (token as any)?.user?.role;
  const mustChangePassword =
    (token as any)?.mustChangePassword ?? (token as any)?.user?.mustChangePassword;

  if (mustChangePassword) {
    if (pathname !== "/change-password") {
      const url = req.nextUrl.clone();
      url.pathname = "/change-password";
      const red = NextResponse.redirect(url);
      red.headers.set("x-has-token", "1");
      red.headers.set("x-path", pathname);
      return red;
    }
    return okRes;
  }

  if (pathname === "/change-password") {
    const url = req.nextUrl.clone();
    url.pathname = role === "ADMIN" ? "/admin" : "/employee";
    const red = NextResponse.redirect(url);
    red.headers.set("x-has-token", "1");
    red.headers.set("x-path", pathname);
    return red;
  }

  if (pathname.startsWith("/admin")) {
    if (role !== "ADMIN") {
      const url = req.nextUrl.clone();
      url.pathname = "/employee";
      const red = NextResponse.redirect(url);
      red.headers.set("x-has-token", "1");
      red.headers.set("x-path", pathname);
      return red;
    }
  }

  if (pathname.startsWith("/employee")) {
    if (role !== "EMPLOYEE" && role !== "ADMIN") {
      const url = req.nextUrl.clone();
      url.pathname = "/auth/signin";
      const red = NextResponse.redirect(url);
      red.headers.set("x-has-token", "1");
      red.headers.set("x-path", pathname);
      return red;
    }
  }

  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = role === "ADMIN" ? "/admin" : "/employee";
    const red = NextResponse.redirect(url);
    red.headers.set("x-has-token", "1");
    red.headers.set("x-path", pathname);
    return red;
  }

  return okRes;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

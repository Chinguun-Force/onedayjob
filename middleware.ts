import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = ["/auth/signin"];

/**
 * Checks if the given path is publicly accessible
 */
function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/"));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip middleware for internal Next.js paths and static files
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = await getToken({ req });

  // Handle unauthorized access
  if (!token) {
    if (isPublicPath(pathname)) {
      return NextResponse.next();
    }

    const signInUrl = req.nextUrl.clone();
    signInUrl.pathname = "/auth/signin";
    signInUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(signInUrl);
  }

  const role = token.role as string | undefined;
  const mustChangePassword = token.mustChangePassword as boolean | undefined;

  // Force password change if required
  if (mustChangePassword) {
    if (pathname !== "/change-password") {
      const changePasswordUrl = req.nextUrl.clone();
      changePasswordUrl.pathname = "/change-password";
      return NextResponse.redirect(changePasswordUrl);
    }
    return NextResponse.next();
  }

  // Prevent access to change-password if not mandatory
  if (pathname === "/change-password") {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = role === "ADMIN" ? "/admin" : "/employee";
    return NextResponse.redirect(redirectUrl);
  }

  // Role-based protection: Admin paths
  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    const employeeUrl = req.nextUrl.clone();
    employeeUrl.pathname = "/employee";
    return NextResponse.redirect(employeeUrl);
  }

  // Role-based protection: Employee paths
  if (pathname.startsWith("/employee")) {
    const isAuthorized = role === "EMPLOYEE" || role === "ADMIN";
    if (!isAuthorized) {
      const signInUrl = req.nextUrl.clone();
      signInUrl.pathname = "/auth/signin";
      return NextResponse.redirect(signInUrl);
    }
  }

  // Default redirect for root path
  if (pathname === "/") {
    const dashboardUrl = req.nextUrl.clone();
    dashboardUrl.pathname = role === "ADMIN" ? "/admin" : "/employee";
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

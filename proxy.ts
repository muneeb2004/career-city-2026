import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";

const PUBLIC_PATHS = new Set(["/", "/login", "/signup", "/welcome"]);
const PUBLIC_API_PATHS = new Set(["/api/auth/login", "/api/auth/signup"]);

const PUBLIC_FILE = /\.(.*)$/;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_FILE.test(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith("/login/") ||
    PUBLIC_API_PATHS.has(pathname)
  ) {
    return NextResponse.next();
  }

  const tokenFromCookie = request.cookies.get("token")?.value;
  const bearerToken = request.headers.get("authorization")?.replace("Bearer ", "");
  const token = tokenFromCookie || bearerToken;

  if (!token) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const payload = await verifyJWT(token);

    const requestHeaders = new Headers(request.headers);
    if (payload.sub) {
      requestHeaders.set("x-user-id", String(payload.sub));
    }
    if (payload.role) {
      requestHeaders.set("x-user-role", String(payload.role));
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.error("Proxy token verification failed", error);

    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};

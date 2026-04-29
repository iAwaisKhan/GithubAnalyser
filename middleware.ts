import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require authentication
const PROTECTED_ROUTES = ["/dashboard", "/billing", "/compare"];

// Routes that require pro or above
const PRO_ROUTES = ["/compare"];

export default withAuth(
  function middleware(req: NextRequest & { nextauth?: { token?: { plan?: string } | null } }) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth?.token;

    // Pro-only route check
    if (PRO_ROUTES.some((r) => pathname.startsWith(r))) {
      const plan = token?.plan ?? "free";
      if (plan === "free") {
        const url = req.nextUrl.clone();
        url.pathname = "/billing";
        url.searchParams.set("reason", "pro_required");
        return NextResponse.redirect(url);
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ token, req }) {
        const { pathname } = req.nextUrl;
        // Only enforce auth on protected routes
        if (PROTECTED_ROUTES.some((r) => pathname.startsWith(r))) {
          return !!token;
        }
        return true;
      },
    },
    pages: {
      signIn: "/auth/signin",
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/billing/:path*", "/compare/:path*"],
};

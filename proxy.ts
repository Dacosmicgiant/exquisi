import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/auth.config";

// Optimistic gate only (session cookie present). Real checks live in requireStaff().
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/admin/:path*"],
};

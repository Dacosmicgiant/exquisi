import "server-only";
import { redirect } from "next/navigation";
import { auth } from "./auth";

/**
 * Defence in depth: proxy.ts already guards /admin, but every server action,
 * route handler and admin page re-checks the session itself.
 * v2: swap for requireRole()/restaurant-scoped checks; callers don't change.
 */
export async function requireStaff() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  return session.user;
}

/** For route handlers: returns null instead of redirecting. */
export async function getStaff() {
  const session = await auth();
  return session?.user ?? null;
}

"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth/auth";

export async function loginAction(_prev: { error?: string; email?: string } | undefined, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  try {
    await signIn("credentials", {
      email,
      password: String(formData.get("password") ?? ""),
      redirectTo: "/admin",
    });
  } catch (e) {
    if (e instanceof AuthError) return { error: "Those credentials don't match our records.", email };
    throw e; // the successful-sign-in redirect
  }
}

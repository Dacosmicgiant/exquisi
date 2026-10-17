import type { NextAuthConfig } from "next-auth";

/**
 * Edge/proxy-safe half of the Auth.js config (no DB, no bcrypt).
 * The Credentials provider is added in auth.ts.
 */
export const authConfig = {
  pages: { signIn: "/admin/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const loggedIn = !!auth?.user;
      if (pathname.startsWith("/admin/login")) {
        // already signed in → straight to the dashboard
        return loggedIn ? Response.redirect(new URL("/admin", request.nextUrl)) : true;
      }
      return loggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = user.role ?? "staff";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.uid ?? token.sub ?? "");
        session.user.role = String(token.role ?? "staff");
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

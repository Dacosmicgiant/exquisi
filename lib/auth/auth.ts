import "server-only";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { users } from "@/lib/db/platform";
import { authConfig } from "./auth.config";

declare module "next-auth" {
  interface User {
    role?: string;
  }
  interface Session {
    user: { id: string; role: string; email: string; name?: string | null };
  }
}
declare module "@auth/core/jwt" {
  interface JWT {
    uid?: string;
    role?: string;
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

// compared against when the email is unknown, so timing doesn't reveal which emails exist
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO5Ymb1G1Z0Wn9qjVQd5Wm1H1mH1q8x8e";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const user = await users.findByEmail(parsed.data.email);
        const ok = await bcrypt.compare(parsed.data.password, user?.password_hash ?? DUMMY_HASH);
        if (!user || !ok) return null;
        return { id: user.id, email: user.email, role: user.role };
      },
    }),
  ],
});

/**
 * Create or reset the single staff login.
 * Reads ADMIN_EMAIL / ADMIN_PASSWORD from .env.local. Run: npm run create-admin
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import bcrypt from "bcryptjs";

async function main() {
  const { users } = await import("../lib/db/platform");
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env.local");
  if (password.length < 10) throw new Error("ADMIN_PASSWORD must be at least 10 characters");
  const hash = await bcrypt.hash(password, 12);
  const u = await users.upsert(email, hash, "staff");
  console.log(`staff user ready: ${u.email} (role: ${u.role})`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

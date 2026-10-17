import "server-only";
import { z } from "zod";
import { ConflictError, NotFoundError, TenantError, ValidationError } from "@/lib/db/types";

export type Result<T = void> = { ok: true; data: T } | { ok: false; error: string };

/** Run a server-action body and turn known failures into messages the UI can toast. */
export async function run<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { ok: false, error: e.issues[0]?.message ?? "Invalid input" };
    }
    if (e instanceof ValidationError ||
      e instanceof ConflictError || e instanceof NotFoundError || e instanceof TenantError) {
      return { ok: false, error: e.message };
    }
    // Next.js control-flow errors (redirect/notFound) must propagate
    if (e && typeof e === "object" && "digest" in e) throw e;
    console.error(e);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

import { LogOut } from "lucide-react";
import { AdminNav } from "@/components/admin/AdminNav";
import { MobileNav } from "@/components/admin/MobileNav";
import { ThemeToggle } from "@/components/admin/ThemeToggle";
import { Wordmark } from "@/components/admin/Wordmark";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/auth";
import { requireStaff } from "@/lib/auth/session";

export default async function AdminShell({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r bg-sidebar lg:flex">
        <div className="px-7 pt-9 pb-8">
          <Wordmark />
        </div>
        <div className="mx-7 mb-4 h-px bg-border" />
        <div className="flex-1">
          <AdminNav />
        </div>
        <div className="border-t px-7 py-5">
          <p className="label-caps text-[0.6rem] text-muted-foreground">Signed in</p>
          <p className="mt-1 truncate text-sm">{user.email}</p>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/85 px-4 backdrop-blur sm:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <MobileNav />
            <Wordmark />
          </div>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/admin/login" });
              }}
            >
              <Button variant="ghost" size="icon" type="submit" aria-label="Sign out" title="Sign out">
                <LogOut className="size-4" />
              </Button>
            </form>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8 sm:py-14">{children}</main>
      </div>
    </div>
  );
}

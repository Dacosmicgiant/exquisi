import { ShineBorder } from "@/components/ui/shine-border";
import { ThemeToggle } from "@/components/admin/ThemeToggle";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-30">
        <BackgroundBeams />
      </div>
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-10 text-center">
          <p className="label-caps text-ornament">Atelier</p>
          <h1 className="mt-3 text-5xl">menu&nbsp;·&nbsp;stories</h1>
          <div className="mx-auto mt-6 h-px w-16 bg-ornament" />
        </div>
        <div className="relative overflow-hidden rounded-[var(--radius)] border bg-card/90 p-8 shadow-lifted backdrop-blur sm:p-10">
          <ShineBorder shineColor={["var(--ornament)", "var(--highlight)"]} borderWidth={1} duration={14} />
          <LoginForm />
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">Staff access only.</p>
      </div>
    </main>
  );
}

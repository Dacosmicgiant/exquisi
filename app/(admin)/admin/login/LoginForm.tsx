"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email" className="label-caps">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required autoFocus key={state?.email ?? "initial"} defaultValue={state?.email} className="h-11" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="label-caps">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required className="h-11" />
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" className="h-11 w-full label-caps" disabled={pending}>
        {pending ? "Signing in…" : "Enter the atelier"}
      </Button>
    </form>
  );
}

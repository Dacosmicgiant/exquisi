"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MODE_KEY, type Mode } from "@/lib/theme/mode";

function apply(mode: Mode) {
  const resolved =
    mode === "system"
      ? matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : mode;
  document.documentElement.dataset.mode = resolved;
}

const ORDER: Mode[] = ["light", "dark", "system"];

export function ThemeToggle({ fallback = "system" }: { fallback?: Mode }) {
  const [mode, setMode] = useState<Mode>(fallback);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(MODE_KEY) as Mode | null;
      // sync from localStorage (an external store) once on mount
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved && ORDER.includes(saved)) setMode(saved);
    } catch {}
  }, []);

  useEffect(() => {
    if (mode !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const on = () => apply("system");
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [mode]);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
    setMode(next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {}
    apply(next);
  }

  const Icon = mode === "light" ? Sun : mode === "dark" ? Moon : Monitor;
  return (
    <Button variant="ghost" size="icon" onClick={cycle} aria-label={`Theme: ${mode}. Click to change`} title={`Theme: ${mode}`}>
      <Icon className="size-4" />
    </Button>
  );
}

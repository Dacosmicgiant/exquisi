"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

// Shown when a language could not be prepared. Never cached, so the next visit retries.
export default function MenuError({ reset }: { error: Error; reset: () => void }) {
  const { slug } = useParams<{ slug: string }>();
  return (
    <main className="diner grid min-h-dvh place-items-center px-6 text-center">
      <div className="max-w-sm">
        <h1 className="text-3xl">One moment, please</h1>
        <div className="mx-auto my-6 max-w-[8rem] rule-double" />
        <p className="text-muted-foreground">This language is still being prepared. Please try again, or choose another language.</p>
        <div className="mt-8 flex justify-center gap-3">
          <button onClick={reset} className="label-caps border border-ornament px-4 py-2">Try again</button>
          <Link href={`/m/${slug}`} className="label-caps px-4 py-2 text-muted-foreground">Languages</Link>
        </div>
      </div>
    </main>
  );
}

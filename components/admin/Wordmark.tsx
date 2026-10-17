import Link from "next/link";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link href="/admin" className={`block leading-none ${className}`}>
      <span className="font-display text-2xl">menu&nbsp;·&nbsp;stories</span>
      <span className="label-caps mt-1.5 block text-[0.6rem] text-ornament">Atelier</span>
    </Link>
  );
}

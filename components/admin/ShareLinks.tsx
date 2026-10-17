"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied`);
  } catch {
    toast.error("Couldn't copy automatically. Select the text and copy it.");
  }
}

/**
 * Menu links for use before a visit: a booking confirmation, an email, a WhatsApp reply.
 * The address is permanent and public; it opens the language screen (or straight into one language).
 */
export function ShareLinks({
  restaurantName,
  addresses,
  languages,
}: {
  restaurantName: string;
  /** "" = the language screen; otherwise the address for that language code */
  addresses: Record<string, string>;
  languages: { code: string; native: string }[];
}) {
  const [lang, setLang] = useState("");
  const link = addresses[lang] ?? addresses[""];
  const [message, setMessage] = useState<string | null>(null);
  const text =
    message ?? `Thank you for booking with ${restaurantName}. You can browse our menu, in your own language, before you visit: ${link}`;
  const [done, setDone] = useState(false);

  return (
    <section className="space-y-5 border bg-card/60 p-6" data-testid="share-links">
      <div>
        <h2 className="text-3xl">Share before the visit</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Guests who book ahead can see the menu without a QR code: send this link in the booking confirmation. It never changes, works on any
          phone or computer, and lets each guest pick their language.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_16rem]">
        <div className="space-y-2">
          <Label htmlFor="share-link" className="label-caps">Menu link</Label>
          <div className="flex gap-2">
            <Input id="share-link" readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
            <Button variant="outline" onClick={() => copy(link, "Link")} aria-label="Copy link">
              <Copy className="size-4" /> Copy
            </Button>
            <Button variant="ghost" nativeButton={false} render={<a href={link} target="_blank" rel="noreferrer" />} aria-label="Open link">
              <ExternalLink className="size-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="share-lang" className="label-caps">Opens in</Label>
          <NativeSelect id="share-lang" value={lang} onChange={(e) => { setLang(e.target.value); setMessage(null); }}>
            <option value="">Guest chooses a language</option>
            {languages.map((l) => (
              <option key={l.code} value={l.code}>{l.native}</option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="share-msg" className="label-caps">Ready-to-send message</Label>
        <Textarea id="share-msg" rows={3} value={text} onChange={(e) => setMessage(e.target.value)} />
        <Button
          variant="outline"
          onClick={async () => {
            await copy(text, "Message");
            setDone(true);
            setTimeout(() => setDone(false), 2000);
          }}
        >
          {done ? <Check className="size-4" /> : <Copy className="size-4" />} Copy message
        </Button>
      </div>
    </section>
  );
}

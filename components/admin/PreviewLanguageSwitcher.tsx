"use client";

import { useRouter } from "next/navigation";
import { NativeSelect } from "@/components/ui/native-select";

/** One picker instead of a button per language (a restaurant can offer 100+). */
export function PreviewLanguageSwitcher({
  restaurantId,
  options,
  current,
  mode,
}: {
  restaurantId: string;
  options: { code: string; label: string }[];
  current: string;
  mode: string;
}) {
  const router = useRouter();
  return (
    <div className="w-52">
      <NativeSelect
        value={current}
        aria-label="Preview language"
        onChange={(e) => router.push(`/admin/restaurants/${restaurantId}/preview?lang=${e.target.value}&mode=${mode}`)}
      >
        {options.map((o) => (
          <option key={o.code} value={o.code}>{o.label}</option>
        ))}
      </NativeSelect>
    </div>
  );
}

import { fontFaceCss, fontPreloads, themeToCss } from "@/lib/theme/css";
import type { Theme } from "@/lib/theme/schema";

/**
 * Inlines the resolved theme (CSS variables + the page's max-two @font-face
 * rules) into <head>, and preloads those font files. No extra round-trips,
 * no client JS. Render inside <head> of a root layout.
 */
export function ThemeHead({ theme }: { theme: Theme }) {
  return (
    <>
      {fontPreloads(theme).map((href) => (
        <link key={href} rel="preload" href={href} as="font" type="font/woff2" crossOrigin="anonymous" />
      ))}
      <style
        id="theme-vars"
        dangerouslySetInnerHTML={{ __html: fontFaceCss(theme) + themeToCss(theme) }}
      />
    </>
  );
}

/**
 * ★ THE SINGLE THEME FILE ★
 *
 * Every visual decision in menu-stories starts here: palette (light + dark),
 * fonts, type scale, radius, density, shadows, motion and the editorial
 * ornaments. Edit a value, save, and the admin and every diner menu re-theme.
 *
 * Resolution order (see lib/theme/resolve.ts):
 *   this file  <  platform overrides (admin → Theme)  <  restaurant brand overrides
 *
 * The admin panel (/admin/theme and each restaurant's Brand tab) edits the
 * override layers in the database using the exact same shape as below, so
 * anything you can change here you can change from the panel — and vice versa.
 *
 * Direction: rich, old-money Italian. Parchment & bottle green by day,
 * espresso & aged gold by night. Hairline brass rules, tiny radii, generous air.
 */
import type { Theme } from "@/lib/theme/schema";

export const defaultTheme: Theme = {
  /** "system" follows the OS (pure CSS on diner pages, so they stay static). */
  mode: "system",

  colors: {
    light: {
      background: "#F4EEE1", // parchment
      foreground: "#1E1A16", // iron-gall ink
      card: "#FAF6EC", // fine laid paper
      cardForeground: "#1E1A16",
      popover: "#FAF6EC",
      popoverForeground: "#1E1A16",
      primary: "#1F3B2D", // bottle green
      primaryForeground: "#F4EEE1",
      secondary: "#E9E0CC", // vellum
      secondaryForeground: "#1F3B2D",
      muted: "#EBE3D0",
      mutedForeground: "#6B6256",
      accent: "#E6DABA", // sand
      accentForeground: "#1F3B2D",
      destructive: "#8C2A2A",
      border: "#D6CAAE",
      input: "#D6CAAE",
      ring: "#A68A4B",
      ornament: "#A68A4B", // antique brass
      highlight: "#6E1F2A", // Bordeaux
      chart1: "#1F3B2D",
      chart2: "#A68A4B",
      chart3: "#6E1F2A",
      chart4: "#6B7A4B",
      chart5: "#3E4A56",
    },
    dark: {
      background: "#14110E", // espresso
      foreground: "#EDE4D0", // bone
      card: "#1C1814",
      cardForeground: "#EDE4D0",
      popover: "#1C1814",
      popoverForeground: "#EDE4D0",
      primary: "#C2A35A", // aged gold
      primaryForeground: "#14110E",
      secondary: "#26201A",
      secondaryForeground: "#EDE4D0",
      muted: "#221D18",
      mutedForeground: "#A39880",
      accent: "#2B2418",
      accentForeground: "#E6D3A0",
      destructive: "#C35A4F",
      border: "#3A3226",
      input: "#3A3226",
      ring: "#C2A35A",
      ornament: "#B8985A",
      highlight: "#C4757F", // rosato
      chart1: "#C2A35A",
      chart2: "#C4757F",
      chart3: "#8FA27A",
      chart4: "#7C93A8",
      chart5: "#D9CDB4",
    },
  },

  /** Max two font files per page. Keys come from lib/theme/fonts.ts. */
  fonts: {
    display: "cormorant-garamond",
    body: "jost",
  },

  type: {
    baseSize: "1.0625rem",
    lineHeight: 1.6,
    displayWeight: 500,
    displayTracking: "0.005em",
    labelTracking: "0.24em", // letter-spaced small caps labels
  },

  radius: "0.125rem", // near-square: nothing about this should feel "app-like"
  density: "comfortable", // compact | comfortable | spacious

  shadow: {
    soft: "0 1px 0 rgb(0 0 0 / 0.03), 0 14px 34px -20px rgb(30 26 22 / 0.30)",
    lifted: "0 1px 0 rgb(0 0 0 / 0.04), 0 28px 60px -28px rgb(30 26 22 / 0.42)",
  },

  motion: {
    enabled: true,
    duration: "600ms",
    ease: "cubic-bezier(0.22, 0.61, 0.36, 1)",
  },

  ornaments: {
    doubleRule: true, // the classic thin-over-thick rule under headings
    paperGrain: true, // barely-there paper texture
    romanNumerals: true, // I. Antipasti · II. Primi …
    dottedLeaders: true, // Dish ........ 18
  },
};

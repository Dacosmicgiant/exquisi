export type Mode = "light" | "dark" | "system";
export const MODE_KEY = "ms-mode";

/** Inline pre-paint script (no flash). Resolves "system" to an explicit data-mode. */
export const modeScript = (fallback: Mode) =>
  `try{var m=localStorage.getItem("${MODE_KEY}")||"${fallback}";if(m==="system")m=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.mode=m}catch(e){}`;

/**
 * YouTube story videos (unlisted links pasted by staff). Only the 11-character video id is ever stored; every URL
 * the app uses is rebuilt from it here, so nothing else can sneak in. Pure (no SDKs): safe in server and client code.
 *
 * Unlisted videos play in an embed as long as the owner has not turned embedding off; private ones never do.
 */
const ID = /^[A-Za-z0-9_-]{11}$/;

/** The video id from a YouTube link (watch, youtu.be, embed, shorts, live), or null if it is not one. */
export function parseYouTubeUrl(input: string | null | undefined): string | null {
  const raw = (input ?? "").trim();
  if (!raw || raw.length > 300) return null;
  let u: URL;
  try {
    u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.toLowerCase().replace(/^(www|m|music)\./, "");
  const parts = u.pathname.split("/").filter(Boolean);
  let id: string | null = null;
  if (host === "youtu.be") id = parts[0] ?? null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (parts[0] === "watch") id = u.searchParams.get("v");
    else if (["embed", "shorts", "live", "v"].includes(parts[0])) id = parts[1] ?? null;
  }
  return id && ID.test(id) ? id : null;
}

export const isYouTubeId = (id: string | null | undefined): id is string => !!id && ID.test(id);

/** The address staff see and copy: short and stable. */
export const youtubeShortUrl = (id: string) => `https://youtu.be/${id}`;
/** Where the poster links when scripts are off. */
export const youtubeWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;
/** Privacy-enhanced embed (no cookies until played). */
export const youtubeEmbedUrl = (id: string, autoplay = false) =>
  `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1&modestbranding=1${autoplay ? "&autoplay=1" : ""}`;
/** 4:3 poster with letterbox bars; the page crops it to 16:9. Exists for every video, unlike maxresdefault. */
export const youtubePosterUrl = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

/**
 * Pure URL builders (no SDK, safe on server and client).
 * Public ids that start with "demo/" resolve to Cloudinary's public demo cloud,
 * so the seed and diner flow work before real assets exist.
 */
export const DEMO_PREFIX = "demo/";

export function cloudName(): string {
  return (
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    process.env.CLOUDINARY_CLOUD_NAME ||
    "demo"
  );
}

export function resolveAsset(publicId: string): { cloud: string; id: string; isDemo: boolean } {
  if (publicId.startsWith(DEMO_PREFIX)) {
    return { cloud: "demo", id: publicId.slice(DEMO_PREFIX.length), isDemo: true };
  }
  return { cloud: cloudName(), id: publicId, isDemo: false };
}

const base = (cloud: string, type: "image" | "video") =>
  `https://res.cloudinary.com/${cloud}/${type}/upload`;

export function buildImageUrl(
  publicId: string,
  o: { width?: number; height?: number; aspectRatio?: number; fit?: "fill" | "fit" } = {},
): string {
  const { cloud, id } = resolveAsset(publicId);
  const t = ["f_auto", "q_auto"];
  if (o.width && (o.height || o.aspectRatio)) {
    t.push(o.fit === "fit" ? "c_fit" : "c_fill", "g_auto");
  } else if (o.width) t.push("c_limit");
  if (o.width) t.push(`w_${Math.round(o.width)}`);
  if (o.height) t.push(`h_${Math.round(o.height)}`);
  else if (o.aspectRatio) t.push(`ar_${o.aspectRatio}`);
  return `${base(cloud, "image")}/${t.join(",")}/${id}`;
}

export function buildHlsUrl(publicId: string): string {
  const { cloud, id } = resolveAsset(publicId);
  return `${base(cloud, "video")}/sp_auto/${id}.m3u8`;
}

export function buildMp4Url(publicId: string): string {
  const { cloud, id } = resolveAsset(publicId);
  return `${base(cloud, "video")}/f_mp4,q_auto,vc_h264/${id}.mp4`;
}

/** First "meaningful" frame (so_auto) of a video as an f_auto,q_auto image. */
export function buildVideoFrameUrl(publicId: string, width = 900): string {
  const { cloud, id } = resolveAsset(publicId);
  return `${base(cloud, "video")}/so_auto,f_auto,q_auto,c_limit,w_${width}/${id}.jpg`;
}

/** Non-image/video assets such as .vtt caption files. */
export function buildRawUrl(publicId: string): string {
  const { cloud, id } = resolveAsset(publicId);
  return `https://res.cloudinary.com/${cloud}/raw/upload/${id}`;
}

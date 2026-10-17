/**
 * Media service — the ONLY door to media in the app.
 *
 *   getUploadSignature()  server: sign a direct upload (staff only)
 *   imageUrl()            f_auto,q_auto image URL from an ImageRef
 *   videoSources()        playable sources for a story (HLS first)
 *   posterUrl()           poster image: uploaded poster, else the video's first meaningful frame
 *
 * No other file may import `cloudinary` or `next-cloudinary`. Keep it that way so
 * v2 can swap providers or add per-language dubbing (audio tracks vs. per-language
 * variants) without touching the rest of the app.
 */
import type { ImageRef, Story, VideoRef } from "@/lib/db/types";
import type { ImageOpts, UploadKind, UploadSignature, VideoSources } from "./types";
import { buildHlsUrl, buildImageUrl, buildMp4Url, buildRawUrl, buildVideoFrameUrl } from "./urls";

export type { ImageOpts, UploadKind, UploadSignature, VideoSources } from "./types";

export function imageUrl(ref: ImageRef | null | undefined, opts: ImageOpts = {}): string | null {
  if (!ref?.public_id) return null;
  return buildImageUrl(ref.public_id, opts);
}

/**
 * v1 returns the single source. `lang` is accepted now so v2 can select an audio
 * track or a per-language variant here, and nowhere else, whichever the provider
 * supports well.
 */
export function videoSources(
  video: VideoRef | null | undefined,
  opts: { lang?: string; subtitles?: Story["subtitles"] } = {},
): VideoSources | null {
  void opts.lang;
  if (!video?.public_id) return null;
  return {
    hls: buildHlsUrl(video.public_id),
    mp4: buildMp4Url(video.public_id),
    duration: video.duration,
    tracks: (opts.subtitles ?? []).map((s) => ({
      lang: s.lang,
      label: s.label,
      url: buildRawUrl(s.ref.public_id),
    })),
  };
}

export function posterUrl(
  story: Pick<Story, "poster" | "video">,
  opts: { width?: number } = {},
): string | null {
  const width = opts.width ?? 900;
  if (story.poster?.public_id) return buildImageUrl(story.poster.public_id, { width });
  if (story.video?.public_id) return buildVideoFrameUrl(story.video.public_id, width);
  return null;
}

/** Server only (imports the SDK lazily so client bundles never see it). */
export async function getUploadSignature(args: {
  restaurantId: string;
  kind: UploadKind;
}): Promise<UploadSignature> {
  const { signUpload } = await import("./sign.server");
  return signUpload(args.restaurantId, args.kind);
}

/** Parameters a browser upload widget is allowed to have signed. Anything else (eager, notification_url, callback…) is refused. */
const SIGNABLE = new Set(["timestamp", "folder", "source", "tags", "upload_preset", "context", "public_id", "resource_type"]);

export class SignError extends Error {}

/**
 * Sign the exact params an upload widget is about to send. The folder is checked, not trusted:
 * it must be this restaurant's own folder, so one tenant can never upload into another's space.
 */
export async function signWidgetParams(args: {
  restaurantId: string;
  kind: UploadKind;
  params: Record<string, unknown>;
}): Promise<string> {
  const { folderFor, signParams } = await import("./sign.server");
  const { params } = args;
  for (const k of Object.keys(params)) if (!SIGNABLE.has(k)) throw new SignError(`Parameter "${k}" cannot be signed`);
  if (params.folder !== folderFor(args.restaurantId, args.kind)) throw new SignError("Upload folder is not allowed");
  if (typeof params.public_id === "string" && !params.public_id.startsWith(`${folderFor(args.restaurantId, args.kind)}/`)) {
    throw new SignError("public_id must live inside the restaurant folder");
  }
  return signParams(params);
}

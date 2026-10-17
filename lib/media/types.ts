/** Provider-agnostic media shapes. Nothing outside lib/media knows about Cloudinary. */
export type { ImageRef, VideoRef } from "@/lib/db/types";

export type ImageOpts = {
  width?: number;
  height?: number;
  /** e.g. 4/5 */
  aspectRatio?: number;
  /** "fill" crops to the box with smart gravity; "fit" never crops. Default fill. */
  fit?: "fill" | "fit";
};

export type SubtitleTrack = { lang: string; label: string; url: string };

export type VideoSources = {
  /** Adaptive stream (HLS). Preferred everywhere. */
  hls: string;
  /** Progressive fallback for browsers without HLS support at all. */
  mp4: string;
  duration?: number;
  tracks: SubtitleTrack[];
};

export type UploadKind = "image" | "video";

export type UploadSignature = {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  /** Forced, tenant-scoped folder; part of the signed params. */
  folder: string;
  resourceType: "image" | "video";
  uploadPreset?: string;
};

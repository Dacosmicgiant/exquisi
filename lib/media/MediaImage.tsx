"use client";

import { CldImage } from "next-cloudinary";
import type { ImageRef } from "@/lib/db/types";
import { resolveAsset } from "./urls";

type Props = {
  image: ImageRef | null | undefined;
  alt: string;
  width: number;
  height: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
  /** Crop to the width/height box with smart gravity. Default true. */
  crop?: boolean;
};

/**
 * Dish photos, posters and logos. CldImage applies f_auto + q_auto and
 * responsive srcset. Lives in lib/media so no other file imports next-cloudinary.
 */
export function MediaImage({ image, alt, width, height, sizes, priority, className, crop = true }: Props) {
  if (!image?.public_id) return null;
  const { cloud, id, isDemo } = resolveAsset(image.public_id);
  return (
    <CldImage
      src={id}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      crop={crop ? { type: "fill", gravity: "auto", source: true } : undefined}
      format="auto"
      quality="auto"
      className={className}
      {...(isDemo ? { config: { cloud: { cloudName: cloud } } } : {})}
    />
  );
}

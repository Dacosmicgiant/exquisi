"use client";

import { CldUploadWidget } from "next-cloudinary";
import type { ImageRef } from "@/lib/db/types";

/**
 * The shared signed-upload control (images today; the same component serves film uploads later
 * with kind="video"). Files go browser → Cloudinary directly; our server only signs the request.
 * Lives in lib/media so no other file imports next-cloudinary.
 */
export function UploadButton({
  restaurantId,
  kind = "image",
  onUploaded,
  onError,
  children,
}: {
  restaurantId: string;
  kind?: "image" | "video";
  onUploaded: (ref: ImageRef, info: { width?: number; height?: number; duration?: number }) => void;
  onError?: (message: string) => void;
  children: (open: () => void, loading: boolean) => React.ReactNode;
}) {
  const folder = `menu-stories/${restaurantId}/${kind === "video" ? "films" : "images"}`;
  return (
    <CldUploadWidget
      signatureEndpoint={`/api/media/sign?r=${encodeURIComponent(restaurantId)}&kind=${kind}`}
      options={{
        folder,
        sources: ["local", "camera"],
        multiple: false,
        maxFiles: 1,
        resourceType: kind === "video" ? "video" : "image",
        clientAllowedFormats: kind === "video" ? ["mp4", "mov", "webm"] : ["jpg", "jpeg", "png", "webp", "avif"],
        maxFileSize: kind === "video" ? 200_000_000 : 12_000_000,
        cropping: kind === "image",
        croppingAspectRatio: 1,
        showSkipCropButton: true,
        styles: { palette: { window: "#F4EEE1", sourceBg: "#FAF6EC", tabIcon: "#1F3B2D", link: "#1F3B2D", action: "#1F3B2D", inProgress: "#A68A4B", complete: "#1F3B2D", textDark: "#1E1A16", textLight: "#FAF6EC", windowBorder: "#A68A4B", menuIcons: "#6B6256", error: "#8C2A2A" } },
      }}
      onSuccess={(res) => {
        const info = res?.info;
        if (info && typeof info === "object" && "public_id" in info) {
          const i = info as { public_id: string; width?: number; height?: number; duration?: number };
          onUploaded({ provider: "cloudinary", public_id: i.public_id }, { width: i.width, height: i.height, duration: i.duration });
        }
      }}
      onError={(err) => onError?.(typeof err === "string" ? err : ((err as { statusText?: string })?.statusText ?? "Upload failed"))}
    >
      {({ open, isLoading }) => children(open, !!isLoading)}
    </CldUploadWidget>
  );
}

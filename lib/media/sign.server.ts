/**
 * ★ The only file in the codebase that imports the Cloudinary SDK. ★
 * Swapping providers in v2 means replacing this file and urls.ts.
 */
import "server-only";
import { v2 as cloudinary } from "cloudinary";
import type { UploadKind, UploadSignature } from "./types";

let configured = false;
function init() {
  if (configured) return;
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud_name || !api_key || !api_secret) {
    throw new Error("Cloudinary is not configured (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET)");
  }
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
  configured = true;
}

/**
 * Sign a direct-upload request. The folder is forced to the tenant's folder and is
 * part of the signed params, so a staff browser can't upload into another tenant's space.
 */
export const folderFor = (restaurantId: string, kind: UploadKind) =>
  `menu-stories/${restaurantId}/${kind === "video" ? "films" : "images"}`;

export function signUpload(restaurantId: string, kind: UploadKind): UploadSignature {
  init();
  const timestamp = Math.round(Date.now() / 1000);
  const folder = folderFor(restaurantId, kind);
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || undefined;
  const params: Record<string, string | number> = { timestamp, folder };
  if (uploadPreset) params.upload_preset = uploadPreset;
  const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET!);
  return {
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    folder,
    resourceType: kind,
    uploadPreset,
  };
}

/** Raw signing for next-cloudinary's signatureEndpoint (it sends the exact params it will upload). */
export function signParams(paramsToSign: Record<string, unknown>): string {
  init();
  return cloudinary.utils.api_sign_request(
    paramsToSign as Record<string, string | number>,
    process.env.CLOUDINARY_API_SECRET!,
  );
}

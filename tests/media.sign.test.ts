import { beforeAll, describe, expect, it } from "vitest";
import { SignError, signWidgetParams } from "@/lib/media";

const RID = "6ac4013ee7c3c9e9ad6b5202";
const folder = `menu-stories/${RID}/images`;

beforeAll(() => {
  process.env.CLOUDINARY_CLOUD_NAME ||= "demo";
  process.env.CLOUDINARY_API_KEY ||= "k";
  process.env.CLOUDINARY_API_SECRET ||= "s";
});

describe("upload signing", () => {
  it("signs a widget request for the restaurant's own folder", async () => {
    const sig = await signWidgetParams({ restaurantId: RID, kind: "image", params: { timestamp: 1, folder, source: "uw" } });
    expect(sig).toMatch(/^[a-f0-9]{40,64}$/);
  });
  it("refuses another tenant's folder and the video folder for images", async () => {
    await expect(signWidgetParams({ restaurantId: RID, kind: "image", params: { timestamp: 1, folder: "menu-stories/other/images" } })).rejects.toBeInstanceOf(SignError);
    await expect(signWidgetParams({ restaurantId: RID, kind: "image", params: { timestamp: 1, folder: `menu-stories/${RID}/films` } })).rejects.toBeInstanceOf(SignError);
    await expect(signWidgetParams({ restaurantId: RID, kind: "image", params: { timestamp: 1 } })).rejects.toBeInstanceOf(SignError);
  });
  it("refuses parameters that could redirect or transform uploads", async () => {
    for (const bad of ["eager", "notification_url", "callback", "eager_notification_url", "transformation"]) {
      await expect(signWidgetParams({ restaurantId: RID, kind: "image", params: { timestamp: 1, folder, [bad]: "x" } })).rejects.toBeInstanceOf(SignError);
    }
    await expect(signWidgetParams({ restaurantId: RID, kind: "image", params: { timestamp: 1, folder, public_id: "elsewhere/x" } })).rejects.toBeInstanceOf(SignError);
  });
});

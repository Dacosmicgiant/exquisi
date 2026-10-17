import { describe, expect, it } from "vitest";
import { imageUrl, posterUrl, videoSources } from "@/lib/media";

const own = { provider: "cloudinary" as const, public_id: "menu-stories/abc/images/dish" };

describe("media service", () => {
  it("always applies f_auto and q_auto to images", () => {
    const url = imageUrl(own, { width: 640, aspectRatio: 0.8 })!;
    expect(url).toContain("/image/upload/");
    expect(url).toContain("f_auto");
    expect(url).toContain("q_auto");
    expect(url).toContain("w_640");
    expect(url.endsWith("menu-stories/abc/images/dish")).toBe(true);
  });
  it("returns null for missing refs", () => {
    expect(imageUrl(null)).toBeNull();
    expect(videoSources(null)).toBeNull();
  });
  it("serves adaptive HLS via the sp_auto streaming profile", () => {
    const s = videoSources({ provider: "cloudinary", public_id: "menu-stories/abc/films/f1", duration: 30 })!;
    expect(s.hls).toMatch(/\/video\/upload\/sp_auto\/menu-stories\/abc\/films\/f1\.m3u8$/);
    expect(s.mp4).toContain(".mp4");
    expect(s.duration).toBe(30);
  });
  it("resolves demo/ ids to Cloudinary's public demo cloud", () => {
    expect(imageUrl({ provider: "cloudinary", public_id: "demo/samples/food/dessert" })).toContain(
      "res.cloudinary.com/demo/image/upload/",
    );
    expect(videoSources({ provider: "cloudinary", public_id: "demo/dog" })!.hls).toContain(
      "res.cloudinary.com/demo/video/upload/sp_auto/dog.m3u8",
    );
  });
  it("posters: uploaded image first, else the video's first meaningful frame", () => {
    const video = { provider: "cloudinary" as const, public_id: "x/film" };
    expect(posterUrl({ poster: own, video })).toContain("/image/upload/");
    const frame = posterUrl({ poster: null, video })!;
    expect(frame).toContain("/video/upload/so_auto");
    expect(frame).toContain("f_auto");
    expect(frame).toContain("q_auto");
    expect(posterUrl({ poster: null, video: null })).toBeNull();
  });
});

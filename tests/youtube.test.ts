import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db/connect";
import { restaurants } from "@/lib/db/platform";
import { forTenant } from "@/lib/db/tenant";
import { isYouTubeId, parseYouTubeUrl, youtubeEmbedUrl, youtubePosterUrl, youtubeShortUrl, youtubeWatchUrl } from "@/lib/media";

const ID = "dQw4w9WgXcQ";

describe("YouTube link parsing", () => {
  it.each([
    [`https://www.youtube.com/watch?v=${ID}`],
    [`https://youtube.com/watch?v=${ID}&t=42s`],
    [`https://www.youtube.com/watch?feature=share&v=${ID}`],
    [`https://m.youtube.com/watch?v=${ID}`],
    [`https://music.youtube.com/watch?v=${ID}`],
    [`https://youtu.be/${ID}`],
    [`https://youtu.be/${ID}?si=abcdef`],
    [`http://youtu.be/${ID}`],
    [`youtu.be/${ID}`],
    [`www.youtube.com/watch?v=${ID}`],
    [`https://www.youtube.com/embed/${ID}`],
    [`https://www.youtube-nocookie.com/embed/${ID}?rel=0`],
    [`https://www.youtube.com/shorts/${ID}`],
    [`https://www.youtube.com/live/${ID}?feature=share`],
    [`  https://youtu.be/${ID}  `],
  ])("reads the video id from %s", (url) => {
    expect(parseYouTubeUrl(url)).toBe(ID);
  });

  it.each([
    [""],
    ["   "],
    ["hello world"],
    [ID], // a bare id is not a link
    ["https://vimeo.com/123456789"],
    ["https://www.youtube.com/"],
    ["https://www.youtube.com/playlist?list=PL1234567890A"],
    ["https://www.youtube.com/channel/UC1234567890123456789012"],
    ["https://www.youtube.com/watch?v=short"],
    ["https://www.youtube.com/watch?v=" + ID + "x"], // too long
    [`https://youtube.com.evil.example/watch?v=${ID}`],
    [`https://evilyoutube.com/watch?v=${ID}`],
    [`https://notyoutu.be/${ID}`],
    [`javascript:alert(1)//youtu.be/${ID}`],
    [`ftp://youtu.be/${ID}`],
    [`https://youtu.be/${ID.slice(0, 10)}<`],
    ["https://youtu.be/" + "a".repeat(400)],
  ])("rejects %s", (url) => {
    expect(parseYouTubeUrl(url)).toBeNull();
  });

  it("handles null and undefined", () => {
    expect(parseYouTubeUrl(null)).toBeNull();
    expect(parseYouTubeUrl(undefined)).toBeNull();
  });

  it("validates ids and rebuilds every URL from the id alone", () => {
    expect(isYouTubeId(ID)).toBe(true);
    expect(isYouTubeId("nope")).toBe(false);
    expect(isYouTubeId(null)).toBe(false);
    expect(parseYouTubeUrl(youtubeShortUrl(ID))).toBe(ID); // what the admin shows round-trips
    expect(parseYouTubeUrl(youtubeWatchUrl(ID))).toBe(ID);
    expect(youtubePosterUrl(ID)).toBe(`https://i.ytimg.com/vi/${ID}/hqdefault.jpg`);
    const embed = youtubeEmbedUrl(ID, true);
    expect(embed.startsWith(`https://www.youtube-nocookie.com/embed/${ID}?`)).toBe(true);
    expect(embed).toContain("autoplay=1");
    expect(youtubeEmbedUrl(ID)).not.toContain("autoplay");
  });
});

describe("story video storage", () => {
  let rid: string;
  beforeAll(async () => {
    const conn = await connectDb();
    expect(conn.connection.name).toBe("menu_stories_test");
    await conn.connection.dropDatabase();
    rid = (await restaurants.create({ name: { en: "Vid" }, slug: "vid-test", default_language: "en", enabled_languages: ["en"], currency: "INR", status: "live", brand: {} })).id;
  });
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  const base = { title: { en: "T" }, text_fallback: {}, video: null, poster: null, audio_tracks: [], subtitles: [], status: "live" as const };

  it("saves, changes and clears a story's YouTube id", async () => {
    const db = forTenant(rid);
    const s = await db.stories.create({ ...base, youtube_id: ID });
    expect((await db.stories.get(s.id))?.youtube_id).toBe(ID);
    await db.stories.update(s.id, { youtube_id: "AAAAAAAAAAA" });
    expect((await db.stories.get(s.id))?.youtube_id).toBe("AAAAAAAAAAA");
    await db.stories.update(s.id, { youtube_id: null });
    expect((await db.stories.get(s.id))?.youtube_id).toBeNull();
  });

  it("defaults to no video and refuses anything that is not an 11-character id", async () => {
    const db = forTenant(rid);
    const plain = await db.stories.create(base);
    expect((await db.stories.get(plain.id))?.youtube_id ?? null).toBeNull();
    await expect(db.stories.create({ ...base, youtube_id: "https://youtu.be/x" })).rejects.toThrow();
    await expect(db.stories.update(plain.id, { youtube_id: "<script>alert(1)</script>" })).rejects.toThrow();
  });
});

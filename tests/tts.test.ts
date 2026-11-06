import { describe, expect, it } from "vitest";
import { pickVoiceLang, speechTags } from "@/lib/i18n/tts";
import { menuAddress } from "@/lib/qr/generate";

describe("text-to-speech voice matching", () => {
  it("maps catalog languages to the tags devices use", () => {
    expect(speechTags("zh-Hant")).toContain("zh-TW");
    expect(speechTags("nb")).toContain("no-NO");
    expect(speechTags("he")).toContain("iw-IL");
    expect(speechTags("hi")).toEqual(["hi"]);
  });
  it("matches a region-less tag to any region, and prefers exact regional tags", () => {
    expect(pickVoiceLang(["en-US", "it-IT", "hi-IN"], speechTags("hi"))).toBe("hi-IN");
    expect(pickVoiceLang(["en-US", "it_CH"], speechTags("it"))).toBe("it_CH"); // Android uses underscores
    expect(pickVoiceLang(["pt-PT", "pt-BR"], speechTags("pt"))).toBe("pt-BR");
    expect(pickVoiceLang(["pt-PT"], speechTags("pt-PT"))).toBe("pt-PT");
    expect(pickVoiceLang(["no-NO"], speechTags("nb"))).toBe("no-NO");
  });
  it("returns null when the device cannot speak the language (so the button stays hidden)", () => {
    expect(pickVoiceLang(["en-US", "fr-FR"], speechTags("sw"))).toBeNull();
    expect(pickVoiceLang([], speechTags("en"))).toBeNull();
    expect(pickVoiceLang(["zh-CN"], speechTags("zh-Hant"))).toBeNull(); // Traditional needs a TW/HK voice
  });
});

describe("menu share addresses", () => {
  it("builds permanent public links from APP_URL", () => {
    process.env.APP_URL = "https://menu.example.com/";
    expect(menuAddress("casa-valdarno")).toBe("https://menu.example.com/m/casa-valdarno");
    expect(menuAddress("casa-valdarno", "hi")).toBe("https://menu.example.com/m/casa-valdarno/hi");
  });
});

describe("public address", () => {
  it("builds every printed and shared address from one place and ignores trailing slashes", async () => {
    const { appOrigin, menuAddress, qrTargetUrl } = await import("@/lib/qr/generate");
    const saved = process.env.APP_URL;
    process.env.APP_URL = "https://anylanguagemenu.com/";
    expect(appOrigin()).toBe("https://anylanguagemenu.com");
    expect(qrTargetUrl("abc123")).toBe("https://anylanguagemenu.com/r/abc123");
    expect(menuAddress("the-corner-kitchen")).toBe("https://anylanguagemenu.com/m/the-corner-kitchen");
    expect(menuAddress("the-corner-kitchen", "hi")).toBe("https://anylanguagemenu.com/m/the-corner-kitchen/hi");
    delete process.env.APP_URL;
    expect(appOrigin()).toBe("http://localhost:3000");
    expect(appOrigin("https://example.org")).toBe("https://example.org");
    if (saved !== undefined) process.env.APP_URL = saved;
  });

  it("recognises local addresses so production can refuse to print them", async () => {
    const { isLocalOrigin } = await import("@/lib/qr/generate");
    for (const u of ["http://localhost:3000", "http://localhost", "https://localhost:8443", "http://127.0.0.1:3000", "http://[::1]:3000"]) expect(isLocalOrigin(u), u).toBe(true);
    for (const u of ["https://anylanguagemenu.com", "https://www.anylanguagemenu.com", "https://localhost.example.com", "https://menu-stories.vercel.app"]) expect(isLocalOrigin(u), u).toBe(false);
  });
});

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

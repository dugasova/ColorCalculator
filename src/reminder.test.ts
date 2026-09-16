import { describe, it, expect } from "vitest";
import "./i18n";
import { toWhatsAppPhone, buildRevisitReminderText, buildWhatsAppReminderUrl, buildTelegramReminderUrl } from "./reminder";

describe("toWhatsAppPhone", () => {
  it("strips formatting punctuation down to a bare digit string", () => {
    expect(toWhatsAppPhone(" +380 (50) 123-4567 ")).toBe("380501234567");
  });

  it("returns null for a number too short to be a real international number", () => {
    expect(toWhatsAppPhone("—")).toBeNull();
    expect(toWhatsAppPhone("123")).toBeNull();
  });
});

describe("buildWhatsAppReminderUrl", () => {
  it("addresses the link to the client's own digits-only number", () => {
    expect(buildWhatsAppReminderUrl("+380 50 123 4567", "Hi")).toBe("https://wa.me/380501234567?text=Hi");
  });

  it("falls back to WhatsApp's own recipient picker when no usable phone is given", () => {
    expect(buildWhatsAppReminderUrl(null, "Hi")).toBe("https://wa.me/?text=Hi");
    expect(buildWhatsAppReminderUrl("n/a", "Hi")).toBe("https://wa.me/?text=Hi");
  });
});

describe("buildTelegramReminderUrl", () => {
  it("carries the message in a non-empty url so Telegram opens the share picker", () => {
    expect(buildTelegramReminderUrl("Hi there")).toBe("https://t.me/share/url?url=Hi%20there");
  });
});

describe("buildRevisitReminderText", () => {
  it("includes the client's name and the recommended date", () => {
    const text = buildRevisitReminderText({ clientName: "Anna K.", recommendedDate: new Date(2026, 0, 15) });
    expect(text).toContain("Anna K.");
    expect(text).toContain(new Date(2026, 0, 15).toLocaleDateString());
  });
});

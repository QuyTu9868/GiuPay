import { test, expect } from "@playwright/test";
import { coverImage, categoryEmoji } from "../src/lib/coverImage";

/**
 * Unit test cho coverImage() — hàm thuần, không cần browser.
 * (Playwright test runner chạy được cả unit test thuần Node.)
 */

test.describe("coverImage()", () => {
  test("trả về data:image/svg+xml URI hợp lệ", () => {
    const uri = coverImage("demo-1", "Công nghệ", 400, 130);
    expect(uri.startsWith("data:image/svg+xml;utf8,")).toBe(true);
    const svg = decodeURIComponent(uri.replace("data:image/svg+xml;utf8,", ""));
    expect(svg).toContain("<svg");
    expect(svg).toContain('width="400"');
    expect(svg).toContain('height="130"');
    expect(svg).toContain("linearGradient");
  });

  test("deterministic — cùng seed cho ra cùng ảnh", () => {
    expect(coverImage("demo-5", "Sách")).toBe(coverImage("demo-5", "Sách"));
  });

  test("seed khác nhau thường cho gradient khác (khác chuỗi output)", () => {
    const a = coverImage("aaaa", "Sách");
    const b = coverImage("zzzz9", "Sách");
    expect(a).not.toBe(b);
  });

  test("emoji đúng theo danh mục", () => {
    expect(categoryEmoji("Công nghệ")).toBe("💻");
    expect(categoryEmoji("Đồ chơi & Mẹ bé")).toBe("🧸");
    expect(categoryEmoji("Electronics")).toBe("💻");
    // danh mục lạ → emoji mặc định
    expect(categoryEmoji("KhôngTồnTại")).toBe("🛍️");
  });

  test("không nhúng URL external nào", () => {
    const uri = coverImage("demo-9", "Sách");
    expect(uri).not.toContain("http://");
    expect(uri).not.toContain("https://");
    expect(uri).not.toContain("loremflickr");
  });
});

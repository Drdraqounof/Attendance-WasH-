import { describe, expect, it } from "vitest";
import {
  isValidEmail,
  nameProblem,
  normalizeEmail,
  PASSWORD_MAX_LENGTH,
  passwordProblem,
} from "./account-rules";
import { hashToken, newToken } from "./tokens";

describe("account rules — email", () => {
  it("normalizes case and whitespace", () => {
    expect(normalizeEmail("  Jane.Doe@Example.COM ")).toBe("jane.doe@example.com");
  });

  it("accepts ordinary addresses and rejects malformed ones", () => {
    expect(isValidEmail("manager@ops.example")).toBe(true);
    expect(isValidEmail("no-at-sign")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail("a b@c.com")).toBe(false);
  });
});

describe("account rules — password", () => {
  it("requires length and a letter + number", () => {
    expect(passwordProblem("short1")).toMatch(/at least 8/);
    expect(passwordProblem("allletters")).toMatch(/letter and one number/);
    expect(passwordProblem("12345678")).toMatch(/letter and one number/);
    expect(passwordProblem("12341234a")).toBeNull();
    expect(passwordProblem("a1".repeat(PASSWORD_MAX_LENGTH))).toMatch(/at most/);
  });
});

describe("account rules — name", () => {
  it("requires a non-blank, reasonably short name", () => {
    expect(nameProblem("   ")).toMatch(/Enter your name/);
    expect(nameProblem("x".repeat(81))).toMatch(/under 80/);
    expect(nameProblem("Sam Lee")).toBeNull();
  });
});

describe("tokens", () => {
  it("issues unique random tokens and hashes them deterministically", () => {
    const a = newToken();
    const b = newToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(43);
    expect(hashToken(a)).toBe(hashToken(a));
    expect(hashToken(a)).not.toBe(a);
    expect(hashToken(a)).toMatch(/^[0-9a-f]{64}$/);
  });
});

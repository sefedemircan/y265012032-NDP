import { describe, expect, it } from "vitest";
import { assertPasswordIsPrivate } from "./guards";

describe("parola gizliliği", () => {
  it("parolanın ad veya kurum alanına yazılmasını reddeder", () => {
    expect(() => assertPasswordIsPrivate("Test123", ["Ayşe Kaya", "Test123"])).toThrow(
      /herkese açık/,
    );
  });

  it("paroladan farklı herkese açık alanları kabul eder", () => {
    expect(() => assertPasswordIsPrivate("Test123", ["Ayşe Kaya", "Merkez Hastanesi"])).not.toThrow();
  });
});

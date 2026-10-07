import { DomainError } from "../errors";

export function parseLiraToKurus(value: string): number {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new DomainError("Ücret geçersiz.");
  }
  const [lira, fraction = ""] = normalized.split(".");
  return Number(lira) * 100 + Number(fraction.padEnd(2, "0"));
}

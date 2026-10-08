import { DomainError } from "@/domain/errors";

export function toActionError(error: unknown): string {
  if (error instanceof DomainError) return error.message;
  if (error instanceof Error) {
    if (/already registered|already been registered|duplicate key/i.test(error.message)) {
      return "Bu e-posta zaten kayıtlı.";
    }
    return error.message;
  }
  return "Beklenmeyen bir hata oluştu.";
}

export function assertPassword(password: string): void {
  if (password.length < 6) throw new DomainError("Parola en az 6 karakter olmalıdır.");
}

export function assertDateISO(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new DomainError("Tarih geçersiz.");
  return value;
}

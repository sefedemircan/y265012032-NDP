import { DomainError } from "../errors";
import type { ApprovalTarget } from "../scheduling/ApprovalTarget";

export type UserRole = "patient" | "doctor" | "health_personnel" | "clinic_manager";

export abstract class User {
  constructor(
    private readonly id: string,
    private readonly fullName: string,
    private readonly email: string,
  ) {
    if (!id) throw new DomainError("Kullanıcı kimliği boş olamaz.");
    if (!fullName.trim()) throw new DomainError("Ad soyad boş olamaz.");
    if (!email.includes("@")) throw new DomainError("E-posta geçersiz.");
  }

  getId(): string {
    return this.id;
  }

  getFullName(): string {
    return this.fullName;
  }

  getEmail(): string {
    return this.email;
  }

  abstract getRole(): UserRole;

  abstract canApprove(appointment: ApprovalTarget): boolean;
}

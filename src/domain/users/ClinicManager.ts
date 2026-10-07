import { DomainError } from "../errors";
import type { ApprovalTarget } from "../scheduling/ApprovalTarget";
import { User, type UserRole } from "./User";

export class ClinicManager extends User {
  constructor(
    id: string,
    fullName: string,
    email: string,
    private readonly organizationId: string,
  ) {
    super(id, fullName, email);
    if (!organizationId) throw new DomainError("Yönetici bir kuruma bağlı olmalıdır.");
  }

  getRole(): UserRole {
    return "clinic_manager";
  }

  getOrganizationId(): string {
    return this.organizationId;
  }

  managesOrganization(organizationId: string): boolean {
    return this.organizationId === organizationId;
  }

  canApprove(appointment: ApprovalTarget): boolean {
    return (
      appointment.getStatus() === "PENDING" &&
      appointment.getOrganizationId() === this.organizationId
    );
  }
}

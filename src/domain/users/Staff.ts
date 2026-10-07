import { DomainError } from "../errors";
import type { MedicalService } from "../organization/MedicalService";
import type { ApprovalTarget } from "../scheduling/ApprovalTarget";
import { User } from "./User";

export abstract class Staff extends User {
  private readonly serviceIds: readonly string[];

  constructor(
    id: string,
    fullName: string,
    email: string,
    private readonly facilityId: string,
    serviceIds: readonly string[],
  ) {
    super(id, fullName, email);
    if (!facilityId) throw new DomainError("Personel bir kuruma bağlı olmalıdır.");
    this.serviceIds = [...serviceIds];
  }

  getFacilityId(): string {
    return this.facilityId;
  }

  getServiceIds(): readonly string[] {
    return this.serviceIds;
  }

  canApprove(appointment: ApprovalTarget): boolean {
    return appointment.getStaffId() === this.getId() && appointment.getStatus() === "PENDING";
  }

  abstract provides(service: MedicalService): boolean;

  abstract assertCanOffer(services: readonly MedicalService[]): void;
}

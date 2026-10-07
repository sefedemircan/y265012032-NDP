import { DomainError } from "../errors";
import type { MedicalService } from "../organization/MedicalService";
import { Staff } from "./Staff";
import type { UserRole } from "./User";

export class Doctor extends Staff {
  constructor(
    id: string,
    fullName: string,
    email: string,
    private readonly specialty: string,
    facilityId: string,
    serviceIds: readonly string[],
  ) {
    super(id, fullName, email, facilityId, serviceIds);
    if (!specialty.trim()) throw new DomainError("Doktorun uzmanlık alanı olmalıdır.");
  }

  getRole(): UserRole {
    return "doctor";
  }

  getSpecialty(): string {
    return this.specialty;
  }

  provides(service: MedicalService): boolean {
    return service.getCategory() === "examination" && this.getServiceIds().includes(service.getId());
  }

  assertCanOffer(services: readonly MedicalService[]): void {
    for (const service of services) {
      if (service.getCategory() !== "examination") {
        throw new DomainError("Doktor yalnızca muayene hizmeti verebilir.");
      }
    }
  }
}

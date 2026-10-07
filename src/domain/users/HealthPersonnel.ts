import { DomainError } from "../errors";
import type { MedicalService } from "../organization/MedicalService";
import { Staff } from "./Staff";
import type { UserRole } from "./User";

export class HealthPersonnel extends Staff {
  getRole(): UserRole {
    return "health_personnel";
  }

  provides(service: MedicalService): boolean {
    const category = service.getCategory();
    return (
      (category === "diagnostic" || category === "laboratory") &&
      this.getServiceIds().includes(service.getId())
    );
  }

  assertCanOffer(services: readonly MedicalService[]): void {
    for (const service of services) {
      const category = service.getCategory();
      if (category !== "diagnostic" && category !== "laboratory") {
        throw new DomainError("Sağlık personeli yalnızca tanı ve laboratuvar hizmeti verebilir.");
      }
    }
  }
}

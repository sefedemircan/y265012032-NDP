import { HealthcareFacility } from "./HealthcareFacility";

export class Clinic extends HealthcareFacility {
  getKind(): "clinic" {
    return "clinic";
  }

  getParentId(): string | null {
    return this.getOrganizationId() === this.getId() ? null : this.getOrganizationId();
  }
}

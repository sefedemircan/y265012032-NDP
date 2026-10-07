import { DomainError } from "../errors";
import type { Department } from "./Department";
import { Clinic } from "./Clinic";
import { HealthcareFacility } from "./HealthcareFacility";
import type { WorkingHours } from "./WorkingHours";

export class Hospital extends HealthcareFacility {
  private readonly branches: Clinic[] = [];

  constructor(
    id: string,
    name: string,
    workingHours: readonly WorkingHours[],
    departments: readonly Department[],
  ) {
    super(id, name, id, workingHours, departments);
  }

  getKind(): "hospital" {
    return "hospital";
  }

  addBranch(branch: Clinic): void {
    if (branch.getOrganizationId() !== this.getId()) {
      throw new DomainError("Şube bu hastaneye ait değil.");
    }
    if (this.branches.some((item) => item.getId() === branch.getId())) {
      throw new DomainError("Bu şube zaten kayıtlı.");
    }
    this.branches.push(branch);
  }

  getBranches(): readonly Clinic[] {
    return this.branches;
  }
}

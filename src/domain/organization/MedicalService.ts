import { DomainError } from "../errors";

export type ServiceCategory = "examination" | "diagnostic" | "laboratory";

export class MedicalService {
  constructor(
    private readonly id: string,
    private readonly name: string,
    private readonly category: ServiceCategory,
    private readonly durationMinutes: number,
    private readonly feeKurus: number,
    private readonly departmentId: string,
    private readonly facilityId: string,
  ) {
    if (!name.trim()) throw new DomainError("Hizmet adı boş olamaz.");
    if (!departmentId || !facilityId) throw new DomainError("Hizmet bir bölüm ve kuruma bağlı olmalıdır.");
    if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
      throw new DomainError("Hizmet süresi pozitif tam dakika olmalıdır.");
    }
    if (!Number.isInteger(feeKurus) || feeKurus < 0) {
      throw new DomainError("Ücret geçersiz.");
    }
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getCategory(): ServiceCategory {
    return this.category;
  }

  getDurationMinutes(): number {
    return this.durationMinutes;
  }

  getFeeKurus(): number {
    return this.feeKurus;
  }

  getDepartmentId(): string {
    return this.departmentId;
  }

  getFacilityId(): string {
    return this.facilityId;
  }
}

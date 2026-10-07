import { DomainError } from "../errors";

export class Department {
  constructor(
    private readonly id: string,
    private readonly name: string,
    private readonly facilityId: string,
  ) {
    if (!name.trim()) throw new DomainError("Bölüm adı boş olamaz.");
    if (!facilityId) throw new DomainError("Bölüm bir kuruma bağlı olmalıdır.");
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getFacilityId(): string {
    return this.facilityId;
  }
}

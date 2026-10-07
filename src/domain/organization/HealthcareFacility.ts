import { DomainError } from "../errors";
import { istanbulParts } from "../scheduling/istanbulTime";
import { TimeRange } from "../scheduling/TimeRange";
import type { Department } from "./Department";
import type { WorkingHours } from "./WorkingHours";

export abstract class HealthcareFacility {
  constructor(
    private readonly id: string,
    private readonly name: string,
    private readonly organizationId: string,
    private readonly workingHours: readonly WorkingHours[],
    private readonly departments: readonly Department[],
  ) {
    if (!id) throw new DomainError("Kurum kimliği boş olamaz.");
    if (!name.trim()) throw new DomainError("Kurum adı boş olamaz.");
    if (!organizationId) throw new DomainError("Kurum bir organizasyona bağlı olmalıdır.");
  }

  abstract getKind(): "hospital" | "clinic";

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getOrganizationId(): string {
    return this.organizationId;
  }

  getWorkingHours(): readonly WorkingHours[] {
    return this.workingHours;
  }

  getDepartments(): readonly Department[] {
    return this.departments;
  }

  isOpenFor(startsAt: Date, durationMinutes: number): boolean {
    const { dayOfWeek, minutes } = istanbulParts(startsAt);
    if (minutes + durationMinutes > 24 * 60) return false;
    const needed = TimeRange.fromMinutes(minutes, minutes + durationMinutes);
    return this.workingHours.some(
      (hours) => hours.getDayOfWeek() === dayOfWeek && hours.getRange().contains(needed),
    );
  }
}

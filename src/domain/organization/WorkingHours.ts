import { DomainError } from "../errors";
import { TimeRange } from "../scheduling/TimeRange";

export class WorkingHours {
  constructor(
    private readonly id: string,
    private readonly facilityId: string,
    private readonly dayOfWeek: number,
    private readonly range: TimeRange,
  ) {
    if (!facilityId) throw new DomainError("Çalışma saati bir kuruma bağlı olmalıdır.");
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      throw new DomainError("Haftanın günü geçersiz.");
    }
  }

  getId(): string {
    return this.id;
  }

  getFacilityId(): string {
    return this.facilityId;
  }

  getDayOfWeek(): number {
    return this.dayOfWeek;
  }

  getRange(): TimeRange {
    return this.range;
  }
}

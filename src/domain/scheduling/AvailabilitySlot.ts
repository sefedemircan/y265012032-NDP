import { DomainError } from "../errors";
import { istanbulParts } from "./istanbulTime";
import { TimeRange } from "./TimeRange";

export class AvailabilitySlot {
  constructor(
    private readonly id: string,
    private readonly staffId: string,
    private readonly dayOfWeek: number,
    private readonly range: TimeRange,
  ) {
    if (!staffId) throw new DomainError("Uygunluk bir personele bağlı olmalıdır.");
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      throw new DomainError("Haftanın günü geçersiz.");
    }
  }

  getId(): string {
    return this.id;
  }

  getStaffId(): string {
    return this.staffId;
  }

  getDayOfWeek(): number {
    return this.dayOfWeek;
  }

  getRange(): TimeRange {
    return this.range;
  }

  covers(staffId: string, startsAt: Date, durationMinutes: number): boolean {
    if (staffId !== this.staffId) return false;
    const { dayOfWeek, minutes } = istanbulParts(startsAt);
    if (dayOfWeek !== this.dayOfWeek) return false;
    if (minutes + durationMinutes > 24 * 60) return false;
    return this.range.contains(TimeRange.fromMinutes(minutes, minutes + durationMinutes));
  }
}

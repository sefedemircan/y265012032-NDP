import { DomainError } from "../errors";

export class TimeRange {
  private constructor(
    private readonly startMinute: number,
    private readonly endMinute: number,
  ) {}

  static fromMinutes(startMinute: number, endMinute: number): TimeRange {
    if (!Number.isInteger(startMinute) || !Number.isInteger(endMinute)) {
      throw new DomainError("Saat aralığı tam dakika olmalıdır.");
    }
    if (startMinute < 0 || endMinute > 24 * 60 || startMinute >= endMinute) {
      throw new DomainError("Saat aralığı geçersiz.");
    }
    return new TimeRange(startMinute, endMinute);
  }

  static fromClock(start: string, end: string): TimeRange {
    return TimeRange.fromMinutes(parseClock(start), parseClock(end));
  }

  getStartMinute(): number {
    return this.startMinute;
  }

  getEndMinute(): number {
    return this.endMinute;
  }

  overlaps(other: TimeRange): boolean {
    return this.startMinute < other.endMinute && other.startMinute < this.endMinute;
  }

  contains(other: TimeRange): boolean {
    return this.startMinute <= other.startMinute && other.endMinute <= this.endMinute;
  }

  intersection(other: TimeRange): TimeRange | null {
    const start = Math.max(this.startMinute, other.startMinute);
    const end = Math.min(this.endMinute, other.endMinute);
    if (start >= end) return null;
    return new TimeRange(start, end);
  }
}

function parseClock(value: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) throw new DomainError("Saat HH:mm biçiminde olmalıdır.");
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 24 || minutes > 59 || (hours === 24 && minutes !== 0)) {
    throw new DomainError("Saat geçersiz.");
  }
  return hours * 60 + minutes;
}

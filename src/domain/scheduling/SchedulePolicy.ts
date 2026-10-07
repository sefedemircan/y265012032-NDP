import { DomainError } from "../errors";
import type { HealthcareFacility } from "../organization/HealthcareFacility";
import type { MedicalService } from "../organization/MedicalService";
import type { WorkingHours } from "../organization/WorkingHours";
import type { Staff } from "../users/Staff";
import { AvailabilitySlot } from "./AvailabilitySlot";
import type { Appointment } from "./Appointment";
import { istanbulParts } from "./istanbulTime";
import { TimeRange } from "./TimeRange";

export class SchedulePolicy {
  assertBookable(input: {
    staff: Staff;
    service: MedicalService;
    facility: HealthcareFacility;
    startsAt: Date;
    availability: readonly AvailabilitySlot[];
    existing: readonly Appointment[];
  }): void {
    if (!input.staff.provides(input.service)) {
      throw new DomainError("Bu personel seçilen hizmeti vermiyor.");
    }
    if (input.service.getFacilityId() !== input.facility.getId()) {
      throw new DomainError("Hizmet bu kurumda sunulmuyor.");
    }
    if (input.staff.getFacilityId() !== input.facility.getId()) {
      throw new DomainError("Personel bu kurumda çalışmıyor.");
    }
    if (!input.facility.isOpenFor(input.startsAt, input.service.getDurationMinutes())) {
      throw new DomainError("Seçilen saat kurum çalışma saatlerinin dışında.");
    }
    const covered = input.availability.some((slot) =>
      slot.covers(input.staff.getId(), input.startsAt, input.service.getDurationMinutes()),
    );
    if (!covered) {
      throw new DomainError("Seçilen saat personelin uygunluk diliminde değil.");
    }

    const endsAt = new Date(input.startsAt.getTime() + input.service.getDurationMinutes() * 60_000);
    const clash = input.existing.some((appointment) => {
      if (!appointment.blocksTime() || appointment.getStaffId() !== input.staff.getId()) return false;
      return input.startsAt < appointment.getEndsAt() && appointment.getStartsAt() < endsAt;
    });
    if (clash) throw new DomainError("Bu saat diliminde çakışan bir randevu var.");
  }

  listStartMinutes(input: {
    dayOfWeek: number;
    durationMinutes: number;
    facilityId: string;
    staffId: string;
    workingHours: readonly WorkingHours[];
    availability: readonly AvailabilitySlot[];
    taken: readonly TimeRange[];
  }): number[] {
    const windows: TimeRange[] = [];
    for (const slot of input.availability) {
      if (slot.getStaffId() !== input.staffId || slot.getDayOfWeek() !== input.dayOfWeek) continue;
      for (const hours of input.workingHours) {
        if (hours.getFacilityId() !== input.facilityId || hours.getDayOfWeek() !== input.dayOfWeek) continue;
        const window = slot.getRange().intersection(hours.getRange());
        if (window) windows.push(window);
      }
    }

    const starts = new Set<number>();
    for (const window of windows) {
      for (
        let minute = window.getStartMinute();
        minute + input.durationMinutes <= window.getEndMinute();
        minute += input.durationMinutes
      ) {
        const candidate = TimeRange.fromMinutes(minute, minute + input.durationMinutes);
        if (!input.taken.some((range) => range.overlaps(candidate))) starts.add(minute);
      }
    }
    return [...starts].sort((left, right) => left - right);
  }
}

export function takenRangesOnDay(existing: readonly Appointment[], dayOfWeek: number): TimeRange[] {
  return existing.flatMap((appointment) => {
    if (!appointment.blocksTime()) return [];
    const { dayOfWeek: appointmentDay, minutes } = istanbulParts(appointment.getStartsAt());
    if (appointmentDay !== dayOfWeek) return [];
    const end = minutes + appointment.getDurationMinutes();
    if (end > 24 * 60) return [];
    return [TimeRange.fromMinutes(minutes, end)];
  });
}

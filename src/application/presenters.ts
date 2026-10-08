import type { Appointment } from "@/domain/scheduling/Appointment";
import { formatMinutes } from "@/lib/format";
import type { AppointmentView } from "./views";
import type { ClinicSnapshot } from "./snapshot";

export function toAppointmentView(snapshot: ClinicSnapshot, appointment: Appointment): AppointmentView {
  return {
    id: appointment.getId(),
    serviceName: appointment.getServiceName(),
    staffName: snapshot.nameOf(appointment.getStaffId()),
    patientName: snapshot.nameOf(appointment.getPatientId()),
    facilityName: snapshot.facilityName(appointment.getFacilityId()),
    startsAt: appointment.getStartsAt().toISOString(),
    durationMinutes: appointment.getDurationMinutes(),
    feeKurus: appointment.getFeeKurus(),
    status: appointment.getStatus(),
  };
}

export function slotLabel(startMinute: number): string {
  return formatMinutes(startMinute);
}

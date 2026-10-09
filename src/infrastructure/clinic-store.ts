import type { SupabaseClient } from "@supabase/supabase-js";
import { DomainError } from "@/domain/errors";
import type { Clinic } from "@/domain/organization/Clinic";
import type { Department } from "@/domain/organization/Department";
import type { MedicalService } from "@/domain/organization/MedicalService";
import type { WorkingHours } from "@/domain/organization/WorkingHours";
import { Appointment } from "@/domain/scheduling/Appointment";
import type { AppointmentStatus } from "@/domain/scheduling/ApprovalTarget";
import type { AvailabilitySlot } from "@/domain/scheduling/AvailabilitySlot";
import { ClinicSnapshot } from "@/application/snapshot";
import type { ClinicStore } from "@/application/ports";
import {
  toAppointment,
  toAppointmentInsert,
  toFacilities,
  toServices,
  toSlot,
  toUser,
  type AppointmentRow,
  type DepartmentRow,
  type FacilityRow,
  type HourRow,
  type LinkRow,
  type ProfileRow,
  type ServiceRow,
  type SlotRow,
} from "./mappers";

type QueryError = { message: string } | null;

function unwrap<T>(result: { data: T; error: QueryError }, fallback: string): T {
  if (result.error) throw new Error(result.error.message || fallback);
  return result.data;
}

export class SupabaseClinicStore implements ClinicStore {
  constructor(private readonly supabase: SupabaseClient) {}

  async load(): Promise<ClinicSnapshot> {
    const [facilities, departments, hours, services, profiles, links, slots, appointments] = await Promise.all([
      this.supabase.from("facilities").select("id, name, kind, parent_id"),
      this.supabase.from("departments").select("id, facility_id, name"),
      this.supabase.from("working_hours").select("id, facility_id, day_of_week, start_minute, end_minute"),
      this.supabase.from("medical_services").select("id, department_id, name, category, duration_minutes, fee_kurus"),
      this.supabase.from("profiles").select("id, full_name, email, role, specialty, facility_id"),
      this.supabase.from("staff_services").select("staff_id, service_id"),
      this.supabase.from("availability_slots").select("id, staff_id, day_of_week, start_minute, end_minute"),
      this.supabase
        .from("appointments")
        .select(
          "id, patient_id, staff_id, facility_id, organization_id, service_id, service_name, duration_minutes, fee_kurus, starts_at, status",
        ),
    ]);

    const facilityRows = unwrap(facilities, "Kurumlar okunamadı.") as FacilityRow[];
    const departmentRows = unwrap(departments, "Bölümler okunamadı.") as DepartmentRow[];
    const hourRows = unwrap(hours, "Çalışma saatleri okunamadı.") as HourRow[];
    const serviceRows = unwrap(services, "Hizmetler okunamadı.") as ServiceRow[];
    const profileRows = unwrap(profiles, "Profiller okunamadı.") as ProfileRow[];
    const linkRows = unwrap(links, "Personel hizmetleri okunamadı.") as LinkRow[];
    const slotRows = unwrap(slots, "Uygunluk dilimleri okunamadı.") as SlotRow[];
    const appointmentRows = unwrap(appointments, "Randevular okunamadı.") as AppointmentRow[];

    const serviceIds = new Map<string, string[]>();
    for (const link of linkRows) {
      const current = serviceIds.get(link.staff_id) ?? [];
      current.push(link.service_id);
      serviceIds.set(link.staff_id, current);
    }

    return new ClinicSnapshot(
      toFacilities(facilityRows, hourRows, departmentRows),
      toServices(serviceRows, departmentRows),
      profileRows.map((row) => toUser(row, serviceIds.get(row.id) ?? [])),
      slotRows.map(toSlot),
      appointmentRows.map(toAppointment),
    );
  }

  async listBlocking(staffId: string, from: Date, to: Date): Promise<Appointment[]> {
    const result = await this.supabase.rpc("staff_busy_intervals", {
      target_staff: staffId,
      day_start: from.toISOString(),
      day_end: to.toISOString(),
    });
    const rows =
      (unwrap(result, "Dolu saatler okunamadı.") as { starts_at: string; duration_minutes: number }[] | null) ??
      [];
    return rows.map((row, index) =>
      Appointment.restore({
        id: `dolu-${index}`,
        patientId: "gizli",
        staffId,
        facilityId: "gizli",
        organizationId: "gizli",
        serviceId: "gizli",
        serviceName: "Dolu",
        durationMinutes: row.duration_minutes,
        feeKurus: 0,
        startsAt: new Date(row.starts_at),
        status: "PENDING",
      }),
    );
  }

  async insertAppointment(appointment: Appointment): Promise<void> {
    unwrap(
      await this.supabase.from("appointments").insert(toAppointmentInsert(appointment)),
      "Randevu kaydedilemedi.",
    );
  }

  async updateAppointmentStatus(appointment: Appointment, previous: AppointmentStatus): Promise<void> {
    const result = await this.supabase
      .from("appointments")
      .update({ status: appointment.getStatus() })
      .eq("id", appointment.getId())
      .eq("status", previous)
      .select("id");
    const rows = unwrap(result, "Randevu güncellenemedi.") as { id: string }[];
    if (rows.length === 0) throw new DomainError("Randevu durumu değişmiş.");
  }

  async insertClinic(clinic: Clinic): Promise<void> {
    unwrap(
      await this.supabase.from("facilities").insert({
        id: clinic.getId(),
        name: clinic.getName(),
        kind: "clinic",
        parent_id: clinic.getParentId(),
      }),
      "Şube kaydedilemedi.",
    );
  }

  async replaceWorkingHours(facilityId: string, hours: readonly WorkingHours[]): Promise<void> {
    unwrap(
      await this.supabase.from("working_hours").delete().eq("facility_id", facilityId),
      "Eski çalışma saatleri silinemedi.",
    );
    if (hours.length === 0) return;
    unwrap(
      await this.supabase.from("working_hours").insert(
        hours.map((item) => ({
          id: item.getId(),
          facility_id: facilityId,
          day_of_week: item.getDayOfWeek(),
          start_minute: item.getRange().getStartMinute(),
          end_minute: item.getRange().getEndMinute(),
        })),
      ),
      "Çalışma saatleri kaydedilemedi.",
    );
  }

  async insertDepartment(department: Department): Promise<void> {
    unwrap(
      await this.supabase.from("departments").insert({
        id: department.getId(),
        facility_id: department.getFacilityId(),
        name: department.getName(),
      }),
      "Bölüm kaydedilemedi.",
    );
  }

  async insertService(service: MedicalService): Promise<void> {
    unwrap(
      await this.supabase.from("medical_services").insert({
        id: service.getId(),
        department_id: service.getDepartmentId(),
        name: service.getName(),
        category: service.getCategory(),
        duration_minutes: service.getDurationMinutes(),
        fee_kurus: service.getFeeKurus(),
      }),
      "Hizmet kaydedilemedi.",
    );
  }

  async insertSlot(slot: AvailabilitySlot): Promise<void> {
    unwrap(
      await this.supabase.from("availability_slots").insert({
        id: slot.getId(),
        staff_id: slot.getStaffId(),
        day_of_week: slot.getDayOfWeek(),
        start_minute: slot.getRange().getStartMinute(),
        end_minute: slot.getRange().getEndMinute(),
      }),
      "Uygunluk kaydedilemedi.",
    );
  }

  async deleteSlot(slotId: string): Promise<void> {
    unwrap(await this.supabase.from("availability_slots").delete().eq("id", slotId), "Uygunluk silinemedi.");
  }

  async replaceStaffServices(staffId: string, serviceIds: readonly string[]): Promise<void> {
    unwrap(
      await this.supabase.from("staff_services").delete().eq("staff_id", staffId),
      "Eski hizmet bağlantıları silinemedi.",
    );
    if (serviceIds.length === 0) return;
    unwrap(
      await this.supabase.from("staff_services").insert(
        serviceIds.map((serviceId) => ({ staff_id: staffId, service_id: serviceId })),
      ),
      "Hizmet bağlantıları kaydedilemedi.",
    );
  }
}

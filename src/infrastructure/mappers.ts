import { Department } from "@/domain/organization/Department";
import { Clinic } from "@/domain/organization/Clinic";
import type { HealthcareFacility } from "@/domain/organization/HealthcareFacility";
import { Hospital } from "@/domain/organization/Hospital";
import { MedicalService, type ServiceCategory } from "@/domain/organization/MedicalService";
import { WorkingHours } from "@/domain/organization/WorkingHours";
import { Appointment, type AppointmentProps } from "@/domain/scheduling/Appointment";
import type { AppointmentStatus } from "@/domain/scheduling/ApprovalTarget";
import { AvailabilitySlot } from "@/domain/scheduling/AvailabilitySlot";
import { TimeRange } from "@/domain/scheduling/TimeRange";
import { ClinicManager } from "@/domain/users/ClinicManager";
import { Doctor } from "@/domain/users/Doctor";
import { HealthPersonnel } from "@/domain/users/HealthPersonnel";
import { Patient } from "@/domain/users/Patient";
import type { User, UserRole } from "@/domain/users/User";

export type FacilityRow = {
  id: string;
  name: string;
  kind: "hospital" | "clinic";
  parent_id: string | null;
};

export type DepartmentRow = { id: string; facility_id: string; name: string };
export type HourRow = {
  id: string;
  facility_id: string;
  day_of_week: number;
  start_minute: number;
  end_minute: number;
};
export type ServiceRow = {
  id: string;
  department_id: string;
  name: string;
  category: ServiceCategory;
  duration_minutes: number;
  fee_kurus: number;
};
export type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  specialty: string | null;
  facility_id: string | null;
};
export type LinkRow = { staff_id: string; service_id: string };
export type SlotRow = {
  id: string;
  staff_id: string;
  day_of_week: number;
  start_minute: number;
  end_minute: number;
};
export type AppointmentRow = {
  id: string;
  patient_id: string;
  staff_id: string;
  facility_id: string;
  organization_id: string;
  service_id: string;
  service_name: string;
  duration_minutes: number;
  fee_kurus: number;
  starts_at: string;
  status: AppointmentStatus;
};

export function toUser(row: ProfileRow, serviceIds: readonly string[]): User {
  switch (row.role) {
    case "patient":
      return new Patient(row.id, row.full_name, row.email);
    case "doctor":
      return new Doctor(
        row.id,
        row.full_name,
        row.email,
        row.specialty ?? "",
        row.facility_id ?? "",
        serviceIds,
      );
    case "health_personnel":
      return new HealthPersonnel(row.id, row.full_name, row.email, row.facility_id ?? "", serviceIds);
    case "clinic_manager":
      return new ClinicManager(row.id, row.full_name, row.email, row.facility_id ?? "");
  }
}

export function toFacilities(
  facilityRows: FacilityRow[],
  hourRows: HourRow[],
  departmentRows: DepartmentRow[],
): HealthcareFacility[] {
  const hours = hourRows.map(
    (row) =>
      new WorkingHours(
        row.id,
        row.facility_id,
        row.day_of_week,
        TimeRange.fromMinutes(row.start_minute, row.end_minute),
      ),
  );
  const departments = departmentRows.map((row) => new Department(row.id, row.name, row.facility_id));
  const forFacility = <T extends { getFacilityId(): string }>(items: T[], facilityId: string) =>
    items.filter((item) => item.getFacilityId() === facilityId);

  const clinics = facilityRows
    .filter((row) => row.kind === "clinic")
    .map(
      (row) =>
        new Clinic(
          row.id,
          row.name,
          row.parent_id ?? row.id,
          forFacility(hours, row.id),
          forFacility(departments, row.id),
        ),
    );

  const hospitals = facilityRows
    .filter((row) => row.kind === "hospital")
    .map((row) => {
      const hospital = new Hospital(row.id, row.name, forFacility(hours, row.id), forFacility(departments, row.id));
      for (const clinic of clinics) {
        if (clinic.getParentId() === hospital.getId()) hospital.addBranch(clinic);
      }
      return hospital;
    });

  return [...hospitals, ...clinics];
}

export function toServices(rows: ServiceRow[], departments: DepartmentRow[]): MedicalService[] {
  const facilityByDepartment = new Map(departments.map((row) => [row.id, row.facility_id]));
  return rows.map(
    (row) =>
      new MedicalService(
        row.id,
        row.name,
        row.category,
        row.duration_minutes,
        row.fee_kurus,
        row.department_id,
        facilityByDepartment.get(row.department_id) ?? "",
      ),
  );
}

export function toSlot(row: SlotRow): AvailabilitySlot {
  return new AvailabilitySlot(
    row.id,
    row.staff_id,
    row.day_of_week,
    TimeRange.fromMinutes(row.start_minute, row.end_minute),
  );
}

export function toAppointment(row: AppointmentRow): Appointment {
  const props: AppointmentProps = {
    id: row.id,
    patientId: row.patient_id,
    staffId: row.staff_id,
    facilityId: row.facility_id,
    organizationId: row.organization_id,
    serviceId: row.service_id,
    serviceName: row.service_name,
    durationMinutes: row.duration_minutes,
    feeKurus: row.fee_kurus,
    startsAt: new Date(row.starts_at),
    status: row.status,
  };
  return Appointment.restore(props);
}

export function toAppointmentInsert(appointment: Appointment) {
  return {
    id: appointment.getId(),
    patient_id: appointment.getPatientId(),
    staff_id: appointment.getStaffId(),
    facility_id: appointment.getFacilityId(),
    organization_id: appointment.getOrganizationId(),
    service_id: appointment.getServiceId(),
    service_name: appointment.getServiceName(),
    duration_minutes: appointment.getDurationMinutes(),
    fee_kurus: appointment.getFeeKurus(),
    starts_at: appointment.getStartsAt().toISOString(),
    status: appointment.getStatus(),
  };
}

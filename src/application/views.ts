import type { ServiceCategory } from "@/domain/organization/MedicalService";
import type { AppointmentStatus } from "@/domain/scheduling/ApprovalTarget";
import type { UserRole } from "@/domain/users/User";

export type AppointmentView = {
  id: string;
  serviceName: string;
  staffName: string;
  patientName: string;
  facilityName: string;
  startsAt: string;
  durationMinutes: number;
  feeKurus: number;
  status: AppointmentStatus;
};

export type StaffOption = {
  id: string;
  fullName: string;
  specialty: string | null;
};

export type ServiceOption = {
  id: string;
  name: string;
  category: ServiceCategory;
  durationMinutes: number;
  feeKurus: number;
  staff: StaffOption[];
};

export type DepartmentOption = {
  id: string;
  name: string;
  services: ServiceOption[];
};

export type BookableFacility = {
  id: string;
  name: string;
  organizationName: string;
  departments: DepartmentOption[];
};

export type PatientDashboard = {
  facilities: BookableFacility[];
  appointments: AppointmentView[];
};

export type SlotView = {
  id: string;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
};

export type StaffDashboard = {
  slots: SlotView[];
  appointments: AppointmentView[];
};

export type HourView = {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
};

export type ManagedStaff = {
  id: string;
  fullName: string;
  email: string;
  role: "doctor" | "health_personnel";
  specialty: string | null;
  serviceIds: string[];
  slots: SlotView[];
};

export type ManagedService = {
  id: string;
  name: string;
  category: ServiceCategory;
  durationMinutes: number;
  feeKurus: number;
};

export type ManagedDepartment = {
  id: string;
  name: string;
  services: ManagedService[];
};

export type ManagedFacility = {
  id: string;
  name: string;
  kind: "hospital" | "clinic";
  hours: HourView[];
  departments: ManagedDepartment[];
  staff: ManagedStaff[];
};

export type ManagerDashboard = {
  organizationName: string;
  organizationKind: "hospital" | "clinic";
  facilities: ManagedFacility[];
  pending: AppointmentView[];
};

export type ActionResult = {
  error?: string;
  message?: string;
};

export type OpenSlot = {
  startMinute: number;
  label: string;
};

export type SessionUser = {
  fullName: string;
  role: UserRole;
};

import type { Clinic } from "@/domain/organization/Clinic";
import type { Department } from "@/domain/organization/Department";
import type { MedicalService } from "@/domain/organization/MedicalService";
import type { WorkingHours } from "@/domain/organization/WorkingHours";
import { Appointment } from "@/domain/scheduling/Appointment";
import type { AppointmentStatus } from "@/domain/scheduling/ApprovalTarget";
import type { AvailabilitySlot } from "@/domain/scheduling/AvailabilitySlot";
import type { UserRole } from "@/domain/users/User";
import type { ClinicSnapshot } from "./snapshot";

export interface ClinicStore {
  load(): Promise<ClinicSnapshot>;
  listBlocking(staffId: string, from: Date, to: Date): Promise<Appointment[]>;
  insertAppointment(appointment: Appointment): Promise<void>;
  updateAppointmentStatus(appointment: Appointment, previous: AppointmentStatus): Promise<void>;
  insertClinic(clinic: Clinic): Promise<void>;
  replaceWorkingHours(facilityId: string, hours: readonly WorkingHours[]): Promise<void>;
  insertDepartment(department: Department): Promise<void>;
  insertService(service: MedicalService): Promise<void>;
  insertSlot(slot: AvailabilitySlot): Promise<void>;
  deleteSlot(slotId: string): Promise<void>;
  replaceStaffServices(staffId: string, serviceIds: readonly string[]): Promise<void>;
}

export type NewAccount = {
  email: string;
  password: string;
  fullName: string;
};

export type ProfileAssignment = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  specialty: string | null;
  facilityId: string | null;
};

export type NewFacility = {
  id: string;
  name: string;
  kind: "hospital" | "clinic";
  parentId: string | null;
};

export interface AccountGateway {
  createConfirmedUser(input: NewAccount): Promise<string>;
  deleteUser(id: string): Promise<void>;
  assignProfile(input: ProfileAssignment): Promise<void>;
  insertFacility(input: NewFacility): Promise<void>;
  deleteFacility(id: string): Promise<void>;
}

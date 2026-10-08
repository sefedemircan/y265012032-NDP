import { DomainError } from "@/domain/errors";
import type { HealthcareFacility } from "@/domain/organization/HealthcareFacility";
import { Clinic } from "@/domain/organization/Clinic";
import type { MedicalService } from "@/domain/organization/MedicalService";
import { Appointment } from "@/domain/scheduling/Appointment";
import type { AvailabilitySlot } from "@/domain/scheduling/AvailabilitySlot";
import { Doctor } from "@/domain/users/Doctor";
import { Staff } from "@/domain/users/Staff";
import type { User } from "@/domain/users/User";

export class ClinicSnapshot {
  constructor(
    private readonly facilities: HealthcareFacility[],
    private readonly services: MedicalService[],
    private readonly users: User[],
    private readonly slots: AvailabilitySlot[],
    private readonly appointments: Appointment[],
  ) {}

  getFacilities(): readonly HealthcareFacility[] {
    return this.facilities;
  }

  getServices(): readonly MedicalService[] {
    return this.services;
  }

  getUsers(): readonly User[] {
    return this.users;
  }

  getSlots(): readonly AvailabilitySlot[] {
    return this.slots;
  }

  getAppointments(): readonly Appointment[] {
    return this.appointments;
  }

  requireFacility(id: string): HealthcareFacility {
    const facility = this.facilities.find((item) => item.getId() === id);
    if (!facility) throw new DomainError("Kurum bulunamadı.");
    return facility;
  }

  requireClinic(id: string): Clinic {
    const facility = this.requireFacility(id);
    if (!(facility instanceof Clinic)) throw new DomainError("Randevu şube veya klinikte alınır.");
    return facility;
  }

  requireService(id: string): MedicalService {
    const service = this.services.find((item) => item.getId() === id);
    if (!service) throw new DomainError("Hizmet bulunamadı.");
    return service;
  }

  requireStaff(id: string): Staff {
    const user = this.users.find((item) => item.getId() === id);
    if (!(user instanceof Staff)) throw new DomainError("Personel bulunamadı.");
    return user;
  }

  slotsFor(staffId: string): AvailabilitySlot[] {
    return this.slots.filter((slot) => slot.getStaffId() === staffId);
  }

  nameOf(id: string): string {
    return this.users.find((user) => user.getId() === id)?.getFullName() ?? "—";
  }

  facilityName(id: string): string {
    return this.facilities.find((facility) => facility.getId() === id)?.getName() ?? "—";
  }

  findAppointment(id: string): Appointment {
    const appointment = this.appointments.find((item) => item.getId() === id);
    if (!appointment) throw new DomainError("Randevu bulunamadı.");
    return appointment;
  }

  findSlot(id: string): AvailabilitySlot {
    const slot = this.slots.find((item) => item.getId() === id);
    if (!slot) throw new DomainError("Uygunluk dilimi bulunamadı.");
    return slot;
  }
}

export function isDoctor(user: User): user is Doctor {
  return user instanceof Doctor;
}

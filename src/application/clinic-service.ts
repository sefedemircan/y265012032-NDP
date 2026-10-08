import { DomainError } from "@/domain/errors";
import { Clinic } from "@/domain/organization/Clinic";
import { Department } from "@/domain/organization/Department";
import type { HealthcareFacility } from "@/domain/organization/HealthcareFacility";
import { Hospital } from "@/domain/organization/Hospital";
import { MedicalService, type ServiceCategory } from "@/domain/organization/MedicalService";
import { WorkingHours } from "@/domain/organization/WorkingHours";
import { Appointment } from "@/domain/scheduling/Appointment";
import { AvailabilitySlot } from "@/domain/scheduling/AvailabilitySlot";
import { istanbulDayBounds, istanbulDateTime, istanbulParts } from "@/domain/scheduling/istanbulTime";
import { SchedulePolicy, takenRangesOnDay } from "@/domain/scheduling/SchedulePolicy";
import { TimeRange } from "@/domain/scheduling/TimeRange";
import { ClinicManager } from "@/domain/users/ClinicManager";
import type { Patient } from "@/domain/users/Patient";
import { Staff } from "@/domain/users/Staff";
import type { User } from "@/domain/users/User";
import { assertDateISO } from "./guards";
import type { ClinicStore } from "./ports";
import { slotLabel, toAppointmentView } from "./presenters";
import { ClinicSnapshot, isDoctor } from "./snapshot";
import type {
  ManagedFacility,
  ManagerDashboard,
  OpenSlot,
  PatientDashboard,
  StaffDashboard,
} from "./views";

export class ClinicService {
  constructor(private readonly store: ClinicStore) {}

  async patientDashboard(patient: Patient): Promise<PatientDashboard> {
    const snapshot = await this.store.load();
    const facilities = snapshot
      .getFacilities()
      .flatMap((facility) => {
        if (facility.getKind() !== "clinic") return [];
        const clinic = snapshot.requireClinic(facility.getId());
        const departments = clinic
          .getDepartments()
          .map((department) => {
            const services = snapshot
              .getServices()
              .filter((service) => service.getDepartmentId() === department.getId())
              .flatMap((service) => {
                const staff = snapshot
                  .getUsers()
                  .filter((user): user is Staff => user instanceof Staff && user.provides(service))
                  .map((member) => ({
                    id: member.getId(),
                    fullName: member.getFullName(),
                    specialty: isDoctor(member) ? member.getSpecialty() : null,
                  }));
                if (staff.length === 0) return [];
                return [
                  {
                    id: service.getId(),
                    name: service.getName(),
                    category: service.getCategory(),
                    durationMinutes: service.getDurationMinutes(),
                    feeKurus: service.getFeeKurus(),
                    staff,
                  },
                ];
              });
            if (services.length === 0) return null;
            return { id: department.getId(), name: department.getName(), services };
          })
          .filter((department) => department !== null);
        if (departments.length === 0) return [];
        const parentId = clinic.getParentId();
        return [
          {
            id: clinic.getId(),
            name: clinic.getName(),
            organizationName: parentId ? snapshot.facilityName(parentId) : clinic.getName(),
            departments,
          },
        ];
      });

    const appointments = snapshot
      .getAppointments()
      .filter((appointment) => appointment.getPatientId() === patient.getId())
      .sort((left, right) => left.getStartsAt().getTime() - right.getStartsAt().getTime())
      .map((appointment) => toAppointmentView(snapshot, appointment));

    return { facilities, appointments };
  }

  async staffDashboard(staff: Staff): Promise<StaffDashboard> {
    const snapshot = await this.store.load();
    return {
      slots: snapshot.slotsFor(staff.getId()).map((slot) => ({
        id: slot.getId(),
        dayOfWeek: slot.getDayOfWeek(),
        startMinute: slot.getRange().getStartMinute(),
        endMinute: slot.getRange().getEndMinute(),
      })),
      appointments: snapshot
        .getAppointments()
        .filter((appointment) => appointment.getStaffId() === staff.getId())
        .sort((left, right) => left.getStartsAt().getTime() - right.getStartsAt().getTime())
        .map((appointment) => toAppointmentView(snapshot, appointment)),
    };
  }

  async managerDashboard(manager: ClinicManager): Promise<ManagerDashboard> {
    const snapshot = await this.store.load();
    const organization = snapshot.requireFacility(manager.getOrganizationId());
    const facilities = snapshot
      .getFacilities()
      .filter(
        (facility) =>
          facility.getId() === manager.getOrganizationId() ||
          facility.getOrganizationId() === manager.getOrganizationId(),
      )
      .map((facility) => this.toManagedFacility(snapshot, facility));

    const pending = snapshot
      .getAppointments()
      .filter(
        (appointment) =>
          appointment.getOrganizationId() === manager.getOrganizationId() &&
          appointment.getStatus() === "PENDING",
      )
      .sort((left, right) => left.getStartsAt().getTime() - right.getStartsAt().getTime())
      .map((appointment) => toAppointmentView(snapshot, appointment));

    return {
      organizationName: organization.getName(),
      organizationKind: organization.getKind(),
      facilities,
      pending,
    };
  }

  async openSlots(input: {
    facilityId: string;
    serviceId: string;
    staffId: string;
    date: string;
  }): Promise<OpenSlot[]> {
    const date = assertDateISO(input.date);
    const snapshot = await this.store.load();
    const facility = snapshot.requireClinic(input.facilityId);
    const service = snapshot.requireService(input.serviceId);
    const staff = snapshot.requireStaff(input.staffId);
    if (!staff.provides(service) || staff.getFacilityId() !== facility.getId()) {
      throw new DomainError("Bu personel seçilen hizmeti vermiyor.");
    }
    const bounds = istanbulDayBounds(date);
    const blocking = await this.store.listBlocking(staff.getId(), bounds.from, bounds.to);
    const { dayOfWeek } = istanbulParts(istanbulDateTime(date, 12 * 60));
    const minutes = new SchedulePolicy().listStartMinutes({
      dayOfWeek,
      durationMinutes: service.getDurationMinutes(),
      facilityId: facility.getId(),
      staffId: staff.getId(),
      workingHours: facility.getWorkingHours(),
      availability: snapshot.slotsFor(staff.getId()),
      taken: takenRangesOnDay(blocking, dayOfWeek),
    });
    return minutes.map((startMinute) => ({ startMinute, label: slotLabel(startMinute) }));
  }

  async book(
    patient: Patient,
    input: { facilityId: string; serviceId: string; staffId: string; date: string; startMinute: number },
  ): Promise<void> {
    const date = assertDateISO(input.date);
    const snapshot = await this.store.load();
    const startsAt = istanbulDateTime(date, input.startMinute);
    const bounds = istanbulDayBounds(date);
    const staff = snapshot.requireStaff(input.staffId);
    const appointment = Appointment.request({
      id: crypto.randomUUID(),
      patient,
      staff,
      service: snapshot.requireService(input.serviceId),
      facility: snapshot.requireClinic(input.facilityId),
      startsAt,
      availability: snapshot.slotsFor(staff.getId()),
      existing: await this.store.listBlocking(staff.getId(), bounds.from, bounds.to),
    });
    await this.store.insertAppointment(appointment);
  }

  async approve(actor: User, appointmentId: string): Promise<void> {
    await this.decide(actor, appointmentId, "approve");
  }

  async reject(actor: User, appointmentId: string): Promise<void> {
    await this.decide(actor, appointmentId, "reject");
  }

  async cancel(actor: User, appointmentId: string): Promise<void> {
    const snapshot = await this.store.load();
    const appointment = snapshot.findAppointment(appointmentId);
    const previous = appointment.getStatus();
    appointment.cancel(actor);
    await this.store.updateAppointmentStatus(appointment, previous);
  }

  async addBranch(manager: ClinicManager, name: string): Promise<void> {
    const snapshot = await this.store.load();
    const organization = snapshot.requireFacility(manager.getOrganizationId());
    if (!(organization instanceof Hospital)) {
      throw new DomainError("Şube yalnızca hastaneye eklenebilir.");
    }
    const branch = new Clinic(crypto.randomUUID(), name, organization.getId(), [], []);
    organization.addBranch(branch);
    await this.store.insertClinic(branch);
  }

  async addDepartment(manager: ClinicManager, facilityId: string, name: string): Promise<void> {
    const snapshot = await this.store.load();
    this.assertManager(manager, snapshot, facilityId);
    await this.store.insertDepartment(new Department(crypto.randomUUID(), name, facilityId));
  }

  async addService(
    manager: ClinicManager,
    input: {
      facilityId: string;
      departmentId: string;
      name: string;
      category: ServiceCategory;
      durationMinutes: number;
      feeKurus: number;
    },
  ): Promise<void> {
    const snapshot = await this.store.load();
    const facility = this.assertManager(manager, snapshot, input.facilityId);
    const department = facility.getDepartments().find((item) => item.getId() === input.departmentId);
    if (!department) throw new DomainError("Bölüm bulunamadı.");
    await this.store.insertService(
      new MedicalService(
        crypto.randomUUID(),
        input.name,
        input.category,
        input.durationMinutes,
        input.feeKurus,
        department.getId(),
        facility.getId(),
      ),
    );
  }

  async replaceHours(
    manager: ClinicManager,
    facilityId: string,
    entries: { dayOfWeek: number; start: string; end: string }[],
  ): Promise<void> {
    const snapshot = await this.store.load();
    this.assertManager(manager, snapshot, facilityId);
    const hours = entries.map(
      (entry) =>
        new WorkingHours(
          crypto.randomUUID(),
          facilityId,
          entry.dayOfWeek,
          TimeRange.fromClock(entry.start, entry.end),
        ),
    );
    await this.store.replaceWorkingHours(facilityId, hours);
  }

  async addSlot(
    actor: User,
    input: { staffId: string; dayOfWeek: number; start: string; end: string },
  ): Promise<void> {
    const snapshot = await this.store.load();
    const staff = snapshot.requireStaff(input.staffId);
    this.assertSlotAccess(actor, snapshot, staff);
    await this.store.insertSlot(
      new AvailabilitySlot(
        crypto.randomUUID(),
        staff.getId(),
        input.dayOfWeek,
        TimeRange.fromClock(input.start, input.end),
      ),
    );
  }

  async removeSlot(actor: User, slotId: string): Promise<void> {
    const snapshot = await this.store.load();
    const slot = snapshot.findSlot(slotId);
    const staff = snapshot.requireStaff(slot.getStaffId());
    this.assertSlotAccess(actor, snapshot, staff);
    await this.store.deleteSlot(slot.getId());
  }

  private async decide(actor: User, appointmentId: string, decision: "approve" | "reject"): Promise<void> {
    const snapshot = await this.store.load();
    const appointment = snapshot.findAppointment(appointmentId);
    const previous = appointment.getStatus();
    if (decision === "approve") appointment.approve(actor);
    else appointment.reject(actor);
    await this.store.updateAppointmentStatus(appointment, previous);
  }

  private assertManager(manager: ClinicManager, snapshot: ClinicSnapshot, facilityId: string) {
    const facility = snapshot.requireFacility(facilityId);
    if (!manager.managesOrganization(facility.getOrganizationId())) {
      throw new DomainError("Bu kurum yetkinizin dışında.");
    }
    return facility;
  }

  private assertSlotAccess(actor: User, snapshot: ClinicSnapshot, staff: Staff): void {
    if (actor instanceof Staff) {
      if (actor.getId() !== staff.getId()) {
        throw new DomainError("Yalnızca kendi uygunluğunuzu tanımlayabilirsiniz.");
      }
      return;
    }
    if (actor instanceof ClinicManager) {
      const facility = snapshot.requireFacility(staff.getFacilityId());
      if (!actor.managesOrganization(facility.getOrganizationId())) {
        throw new DomainError("Bu personel yetkinizin dışında.");
      }
      return;
    }
    throw new DomainError("Uygunluk tanımlama yetkiniz yok.");
  }

  private toManagedFacility(snapshot: ClinicSnapshot, facility: HealthcareFacility): ManagedFacility {
    return {
      id: facility.getId(),
      name: facility.getName(),
      kind: facility.getKind(),
      hours: facility.getWorkingHours().map((hours) => ({
        dayOfWeek: hours.getDayOfWeek(),
        startMinute: hours.getRange().getStartMinute(),
        endMinute: hours.getRange().getEndMinute(),
      })),
      departments: facility.getDepartments().map((department) => ({
        id: department.getId(),
        name: department.getName(),
        services: snapshot
          .getServices()
          .filter((service) => service.getDepartmentId() === department.getId())
          .map((service) => ({
            id: service.getId(),
            name: service.getName(),
            category: service.getCategory(),
            durationMinutes: service.getDurationMinutes(),
            feeKurus: service.getFeeKurus(),
          })),
      })),
      staff: snapshot
        .getUsers()
        .filter((user): user is Staff => user instanceof Staff && user.getFacilityId() === facility.getId())
        .map((member) => ({
          id: member.getId(),
          fullName: member.getFullName(),
          email: member.getEmail(),
          role: member.getRole() === "doctor" ? "doctor" : "health_personnel",
          specialty: isDoctor(member) ? member.getSpecialty() : null,
          serviceIds: [...member.getServiceIds()],
          slots: snapshot.slotsFor(member.getId()).map((slot) => ({
            id: slot.getId(),
            dayOfWeek: slot.getDayOfWeek(),
            startMinute: slot.getRange().getStartMinute(),
            endMinute: slot.getRange().getEndMinute(),
          })),
        })),
    };
  }
}

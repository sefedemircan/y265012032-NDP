import { DomainError } from "../errors";
import type { HealthcareFacility } from "../organization/HealthcareFacility";
import type { MedicalService } from "../organization/MedicalService";
import type { Patient } from "../users/Patient";
import type { Staff } from "../users/Staff";
import type { User } from "../users/User";
import type { AppointmentStatus } from "./ApprovalTarget";
import { AvailabilitySlot } from "./AvailabilitySlot";
import { SchedulePolicy } from "./SchedulePolicy";

export type AppointmentProps = {
  id: string;
  patientId: string;
  staffId: string;
  facilityId: string;
  organizationId: string;
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  feeKurus: number;
  startsAt: Date;
  status: AppointmentStatus;
};

export class Appointment {
  private constructor(private readonly props: AppointmentProps) {}

  static restore(props: AppointmentProps): Appointment {
    return new Appointment({ ...props, startsAt: new Date(props.startsAt) });
  }

  static request(input: {
    id: string;
    patient: Patient;
    staff: Staff;
    service: MedicalService;
    facility: HealthcareFacility;
    startsAt: Date;
    availability: readonly AvailabilitySlot[];
    existing: readonly Appointment[];
  }): Appointment {
    new SchedulePolicy().assertBookable({
      staff: input.staff,
      service: input.service,
      facility: input.facility,
      startsAt: input.startsAt,
      availability: input.availability,
      existing: input.existing,
    });

    return new Appointment({
      id: input.id,
      patientId: input.patient.getId(),
      staffId: input.staff.getId(),
      facilityId: input.facility.getId(),
      organizationId: input.facility.getOrganizationId(),
      serviceId: input.service.getId(),
      serviceName: input.service.getName(),
      durationMinutes: input.service.getDurationMinutes(),
      feeKurus: input.service.getFeeKurus(),
      startsAt: new Date(input.startsAt),
      status: "PENDING",
    });
  }

  getId(): string {
    return this.props.id;
  }

  getPatientId(): string {
    return this.props.patientId;
  }

  getStaffId(): string {
    return this.props.staffId;
  }

  getFacilityId(): string {
    return this.props.facilityId;
  }

  getOrganizationId(): string {
    return this.props.organizationId;
  }

  getServiceId(): string {
    return this.props.serviceId;
  }

  getServiceName(): string {
    return this.props.serviceName;
  }

  getDurationMinutes(): number {
    return this.props.durationMinutes;
  }

  getFeeKurus(): number {
    return this.props.feeKurus;
  }

  getStartsAt(): Date {
    return new Date(this.props.startsAt);
  }

  getEndsAt(): Date {
    return new Date(this.props.startsAt.getTime() + this.props.durationMinutes * 60_000);
  }

  getStatus(): AppointmentStatus {
    return this.props.status;
  }

  blocksTime(): boolean {
    return this.props.status === "PENDING" || this.props.status === "APPROVED";
  }

  approve(actor: User): void {
    this.assertPending();
    if (!actor.canApprove(this)) throw new DomainError("Bu randevuyu onaylama yetkiniz yok.");
    this.props.status = "APPROVED";
  }

  reject(actor: User): void {
    this.assertPending();
    if (!actor.canApprove(this)) throw new DomainError("Bu randevuyu reddetme yetkiniz yok.");
    this.props.status = "REJECTED";
  }

  cancel(actor: User): void {
    if (actor.getRole() !== "patient" || actor.getId() !== this.props.patientId) {
      throw new DomainError("Bu randevuyu iptal etme yetkiniz yok.");
    }
    if (this.props.status !== "PENDING" && this.props.status !== "APPROVED") {
      throw new DomainError("Bu randevu iptal edilemez.");
    }
    this.props.status = "CANCELLED";
  }

  private assertPending(): void {
    if (this.props.status !== "PENDING") {
      throw new DomainError("Yalnızca onay bekleyen randevu sonuçlandırılabilir.");
    }
  }
}

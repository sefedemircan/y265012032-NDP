import { describe, expect, it } from "vitest";
import { Clinic } from "@/domain/organization/Clinic";
import { Department } from "@/domain/organization/Department";
import type { HealthcareFacility } from "@/domain/organization/HealthcareFacility";
import { Hospital } from "@/domain/organization/Hospital";
import { MedicalService } from "@/domain/organization/MedicalService";
import { WorkingHours } from "@/domain/organization/WorkingHours";
import { parseLiraToKurus } from "@/domain/organization/money";
import { Appointment } from "@/domain/scheduling/Appointment";
import { AvailabilitySlot } from "@/domain/scheduling/AvailabilitySlot";
import { ClinicManager } from "@/domain/users/ClinicManager";
import { Doctor } from "@/domain/users/Doctor";
import { Patient } from "@/domain/users/Patient";
import type { User } from "@/domain/users/User";
import { toAppointment, toFacilities, toServices, toSlot, toUser } from "@/infrastructure/mappers";
import { DEMO_ACCOUNTS, isDemoAccountEmail } from "@/lib/demo-accounts";
import { AccountService } from "./account-service";
import { ClinicService } from "./clinic-service";
import type { AccountGateway, ClinicStore, NewAccount, NewFacility, ProfileAssignment } from "./ports";
import { ClinicSnapshot } from "./snapshot";

class InMemoryClinicStore implements ClinicStore {
  constructor(
    public facilities: HealthcareFacility[] = [],
    public services: MedicalService[] = [],
    public users: User[] = [],
    public slots: AvailabilitySlot[] = [],
    public appointments: Appointment[] = [],
  ) {}

  async load(): Promise<ClinicSnapshot> {
    return new ClinicSnapshot(
      [...this.facilities],
      [...this.services],
      [...this.users],
      [...this.slots],
      [...this.appointments],
    );
  }

  async listBlocking(staffId: string, from: Date, to: Date): Promise<Appointment[]> {
    return this.appointments.filter(
      (apt) =>
        apt.getStaffId() === staffId &&
        apt.blocksTime() &&
        apt.getStartsAt() < to &&
        apt.getEndsAt() > from,
    );
  }

  async insertAppointment(appointment: Appointment): Promise<void> {
    this.appointments.push(appointment);
  }

  async updateAppointmentStatus(appointment: Appointment): Promise<void> {
    const idx = this.appointments.findIndex((item) => item.getId() === appointment.getId());
    if (idx !== -1) this.appointments[idx] = appointment;
  }

  async insertClinic(clinic: Clinic): Promise<void> {
    this.facilities.push(clinic);
  }

  async replaceWorkingHours(facilityId: string, hours: readonly WorkingHours[]): Promise<void> {
    this.facilities = this.facilities.map((facility) => {
      if (facility.getId() !== facilityId) return facility;
      if (facility instanceof Hospital) {
        return new Hospital(facility.getId(), facility.getName(), hours, facility.getDepartments());
      }
      return new Clinic(
        facility.getId(),
        facility.getName(),
        facility.getOrganizationId(),
        hours,
        facility.getDepartments(),
      );
    });
  }

  async insertDepartment(department: Department): Promise<void> {
    this.facilities = this.facilities.map((facility) => {
      if (facility.getId() !== department.getFacilityId()) return facility;
      const nextDepartments = [...facility.getDepartments(), department];
      if (facility instanceof Hospital) {
        return new Hospital(facility.getId(), facility.getName(), facility.getWorkingHours(), nextDepartments);
      }
      return new Clinic(
        facility.getId(),
        facility.getName(),
        facility.getOrganizationId(),
        facility.getWorkingHours(),
        nextDepartments,
      );
    });
  }

  async insertService(service: MedicalService): Promise<void> {
    this.services.push(service);
  }

  async insertSlot(slot: AvailabilitySlot): Promise<void> {
    this.slots.push(slot);
  }

  async deleteSlot(slotId: string): Promise<void> {
    this.slots = this.slots.filter((slot) => slot.getId() !== slotId);
  }

  async replaceStaffServices(): Promise<void> {}
}

class InMemoryAccountGateway implements AccountGateway {
  public users: NewAccount[] = [];
  public facilities: NewFacility[] = [];
  public profiles: ProfileAssignment[] = [];

  async createConfirmedUser(input: NewAccount): Promise<string> {
    this.users.push(input);
    return `user-${this.users.length}`;
  }

  async deleteUser(): Promise<void> {}

  async assignProfile(input: ProfileAssignment): Promise<void> {
    this.profiles.push(input);
  }

  async insertFacility(input: NewFacility): Promise<void> {
    this.facilities.push(input);
  }

  async deleteFacility(): Promise<void> {}
}

describe("hasta kurum seçenekleri ve uçtan uca akışlar", () => {
  it("randevu hizmeti bulunan hastaneyi listeler", async () => {
    const department = new Department("department-1", "Dahiliye", "hospital-1");
    const hospital = new Hospital("hospital-1", "Şehir Hastanesi", [], [department]);
    const medicalService = new MedicalService(
      "service-1",
      "Genel Muayene",
      "examination",
      20,
      50_000,
      department.getId(),
      hospital.getId(),
    );
    const doctor = new Doctor(
      "doctor-1",
      "Dr. Ayşe Kaya",
      "ayse@example.com",
      "Dahiliye",
      hospital.getId(),
      [medicalService.getId()],
    );
    const patient = new Patient("patient-1", "Deniz Yılmaz", "deniz@example.com");
    const snapshot = new ClinicSnapshot([hospital], [medicalService], [doctor, patient], [], []);
    const store = { load: async () => snapshot } as ClinicStore;

    const dashboard = await new ClinicService(store).patientDashboard(patient);

    expect(dashboard.facilities).toEqual([
      expect.objectContaining({
        id: hospital.getId(),
        name: hospital.getName(),
        organizationName: hospital.getName(),
      }),
    ]);
  });

  it("yönetici şube, bölüm, hizmet, çalışma saati, uygunluk ekler; hasta randevu alır; personel/yönetici onaylar; hasta iptal eder", async () => {
    const hospital = new Hospital("hosp-1", "Sakarya Şehir Hastanesi", [], []);
    const manager = new ClinicManager("mgr-1", "Selin Arslan", "yonetici@ndp.test", "hosp-1");
    const patient = new Patient("pat-1", "Deniz Yılmaz", "hasta@ndp.test");
    const store = new InMemoryClinicStore([hospital], [], [manager, patient], [], []);
    const service = new ClinicService(store);

    // 1. Yönetici şube ekler
    await service.addBranch(manager, "Merkez Şube");
    expect(store.facilities).toHaveLength(2);
    const branchId = store.facilities[1].getId();

    // 2. Yönetici şubeye bölüm ekler
    await service.addDepartment(manager, branchId, "Dahiliye");
    const deptId = store.facilities[1].getDepartments()[0].getId();

    // 3. Yönetici bölüme hizmet ekler
    await service.addService(manager, {
      facilityId: branchId,
      departmentId: deptId,
      name: "Genel Muayene",
      category: "examination",
      durationMinutes: 20,
      feeKurus: parseLiraToKurus("500"),
    });
    const srvId = store.services[0].getId();

    // 4. Yönetici çalışma saatlerini kaydeder (Salı 09:00-17:00)
    await service.replaceHours(manager, branchId, [{ dayOfWeek: 2, start: "09:00", end: "17:00" }]);

    // 5. Doktor eklenir ve uygunluk tanımlanır
    const doctor = new Doctor("doc-1", "Dr. Emre Demir", "doktor@ndp.test", "Dahiliye", branchId, [srvId]);
    store.users.push(doctor);
    await service.addSlot(doctor, { staffId: doctor.getId(), dayOfWeek: 2, start: "09:00", end: "10:00" });
    expect(store.slots).toHaveLength(1);

    // 6. Hasta açık saatleri sorgular ve randevu talep eder (2026-10-06 Salı)
    const openBefore = await service.openSlots({
      facilityId: branchId,
      serviceId: srvId,
      staffId: doctor.getId(),
      date: "2026-10-06",
    });
    expect(openBefore.map((s) => s.label)).toEqual(["09:00", "09:20", "09:40"]);

    await service.book(patient, {
      facilityId: branchId,
      serviceId: srvId,
      staffId: doctor.getId(),
      date: "2026-10-06",
      startMinute: 9 * 60,
    });
    expect(store.appointments).toHaveLength(1);
    const aptId = store.appointments[0].getId();

    // Dolu saat listeden düşer
    const openAfter = await service.openSlots({
      facilityId: branchId,
      serviceId: srvId,
      staffId: doctor.getId(),
      date: "2026-10-06",
    });
    expect(openAfter.map((s) => s.label)).toEqual(["09:20", "09:40"]);

    // 7. Yönetici panelinde bekleyen randevu görünür ve onaylanır
    const mgrDash = await service.managerDashboard(manager);
    expect(mgrDash.pending).toHaveLength(1);
    await service.approve(manager, aptId);
    expect(store.appointments[0].getStatus()).toBe("APPROVED");

    // 8. Hasta onaylı randevusunu iptal eder, saat tekrar açılır
    await service.cancel(patient, aptId);
    expect(store.appointments[0].getStatus()).toBe("CANCELLED");

    const openAfterCancel = await service.openSlots({
      facilityId: branchId,
      serviceId: srvId,
      staffId: doctor.getId(),
      date: "2026-10-06",
    });
    expect(openAfterCancel.map((s) => s.label)).toEqual(["09:00", "09:20", "09:40"]);

    // 9. Uygunluk dilimi silinir
    await service.removeSlot(doctor, store.slots[0].getId());
    expect(store.slots).toHaveLength(0);
  });

  it("AccountService hasta, yönetici ve personel kaydını doğrular", async () => {
    const dept = new Department("d1", "Laboratuvar", "c1");
    const clinic = new Clinic("c1", "Merkez Şube", "h1", [], [dept]);
    const labService = new MedicalService("s1", "Kan Tahlili", "laboratory", 15, 25_000, "d1", "c1");
    const manager = new ClinicManager("m1", "Selin Arslan", "yonetici@ndp.test", "h1");
    const store = new InMemoryClinicStore([clinic], [labService], [manager], [], []);
    const gateway = new InMemoryAccountGateway();
    const accounts = new AccountService(store, gateway);

    await accounts.registerPatient({
      fullName: "Yeni Hasta",
      email: "yenihasta@ndp.test",
      password: "GucluSifre123",
    });
    expect(gateway.profiles[0]).toMatchObject({ role: "patient", email: "yenihasta@ndp.test" });

    await accounts.registerManager({
      fullName: "Kurum Yöneticisi",
      email: "kurum@ndp.test",
      password: "GucluSifre123",
      facilityName: "Yeni Klinik",
      kind: "clinic",
    });
    expect(gateway.facilities[0]).toMatchObject({ name: "Yeni Klinik", kind: "clinic" });

    await accounts.registerStaff(manager, {
      facilityId: "c1",
      role: "health_personnel",
      fullName: "Merve Aksoy",
      email: "laborant@ndp.test",
      password: "GucluSifre123",
      specialty: "",
      serviceIds: ["s1"],
    });
    expect(gateway.profiles[2]).toMatchObject({ role: "health_personnel", facilityId: "c1" });
  });

  it("mapper ve demo hesap tanımları NDP isimlendirmesiyle uyumludur", () => {
    expect(DEMO_ACCOUNTS.length).toBeGreaterThanOrEqual(6);
    for (const acc of DEMO_ACCOUNTS) {
      expect(acc.email).toMatch(/@ndp\.test$/);
      expect(isDemoAccountEmail(acc.email)).toBe(true);
    }

    const facilities = toFacilities(
      [
        { id: "h1", name: "Hastane", kind: "hospital", parent_id: null },
        { id: "c1", name: "Şube", kind: "clinic", parent_id: "h1" },
      ],
      [{ id: "wh1", facility_id: "c1", day_of_week: 1, start_minute: 540, end_minute: 1020 }],
      [{ id: "d1", facility_id: "c1", name: "Dahiliye" }],
    );
    expect(facilities).toHaveLength(2);
    expect(toServices([{ id: "s1", department_id: "d1", name: "Muayene", category: "examination", duration_minutes: 20, fee_kurus: 50000 }], [{ id: "d1", facility_id: "c1", name: "Dahiliye" }])[0].getFacilityId()).toBe("c1");
    expect(toUser({ id: "u1", full_name: "Deniz", email: "hasta@ndp.test", role: "patient", specialty: null, facility_id: null }, []).getRole()).toBe("patient");
    expect(toSlot({ id: "sl1", staff_id: "doc1", day_of_week: 1, start_minute: 540, end_minute: 720 }).getDayOfWeek()).toBe(1);
    expect(
      toAppointment({
        id: "a1",
        patient_id: "u1",
        staff_id: "doc1",
        facility_id: "c1",
        organization_id: "h1",
        service_id: "s1",
        service_name: "Muayene",
        duration_minutes: 20,
        fee_kurus: 50000,
        starts_at: "2026-10-06T06:00:00.000Z",
        status: "PENDING",
      }).getStatus(),
    ).toBe("PENDING");
  });
});

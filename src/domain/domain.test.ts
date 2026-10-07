import { describe, expect, it } from "vitest";
import { Clinic } from "./organization/Clinic";
import { Department } from "./organization/Department";
import { Hospital } from "./organization/Hospital";
import { MedicalService } from "./organization/MedicalService";
import { WorkingHours } from "./organization/WorkingHours";
import { Appointment } from "./scheduling/Appointment";
import { AvailabilitySlot } from "./scheduling/AvailabilitySlot";
import { istanbulDateTime } from "./scheduling/istanbulTime";
import { SchedulePolicy } from "./scheduling/SchedulePolicy";
import { TimeRange } from "./scheduling/TimeRange";
import { ClinicManager } from "./users/ClinicManager";
import { Doctor } from "./users/Doctor";
import { HealthPersonnel } from "./users/HealthPersonnel";
import { Patient } from "./users/Patient";

const TUESDAY = "2026-10-06";

function hours(day = 2) {
  return new WorkingHours("h1", "c1", day, TimeRange.fromClock("09:00", "17:00"));
}

function clinic() {
  return new Clinic("c1", "Merkez Şube", "h1", [hours()], [new Department("d1", "Dahiliye", "c1")]);
}

function exam(feeKurus = 50_000) {
  return new MedicalService("s1", "Genel Muayene", "examination", 20, feeKurus, "d1", "c1");
}

function labService() {
  return new MedicalService("s2", "Kan Tahlili", "laboratory", 15, 25_000, "d2", "c1");
}

function doctor(serviceIds: string[] = ["s1"]) {
  return new Doctor("doc", "Dr. Emre Demir", "dr@test.com", "Dahiliye", "c1", serviceIds);
}

function patient() {
  return new Patient("pat", "Deniz Yılmaz", "hasta@test.com");
}

function slot(start = "09:00", end = "12:00", day = 2) {
  return new AvailabilitySlot("a1", "doc", day, TimeRange.fromClock(start, end));
}

function book(overrides?: {
  startsAt?: Date;
  existing?: Appointment[];
  service?: MedicalService;
  staff?: Doctor | HealthPersonnel;
}) {
  const service = overrides?.service ?? exam();
  const staff = overrides?.staff ?? doctor();
  return Appointment.request({
    id: "apt-1",
    patient: patient(),
    staff,
    service,
    facility: clinic(),
    startsAt: overrides?.startsAt ?? istanbulDateTime(TUESDAY, 9 * 60),
    availability: [slot()],
    existing: overrides?.existing ?? [],
  });
}

describe("randevu kuralları", () => {
  it("çakışan randevuyu reddeder, bitişten başlayanı kabul eder", () => {
    const existing = book();
    expect(() => book({ existing: [existing], startsAt: istanbulDateTime(TUESDAY, 9 * 60 + 10) })).toThrow(
      /çakışan/,
    );
    const next = Appointment.request({
      id: "apt-2",
      patient: patient(),
      staff: doctor(),
      service: exam(),
      facility: clinic(),
      startsAt: istanbulDateTime(TUESDAY, 9 * 60 + 20),
      availability: [slot()],
      existing: [existing],
    });
    expect(next.getStatus()).toBe("PENDING");
  });

  it("reddedilen ve iptal edilen randevu yer kaplamaz", () => {
    const rejected = book();
    rejected.reject(doctor());
    const cancelled = book();
    cancelled.cancel(patient());
    expect(() => book({ existing: [rejected, cancelled] })).not.toThrow();
  });

  it("uygunluk ve çalışma saati dışını reddeder", () => {
    expect(() => book({ startsAt: istanbulDateTime(TUESDAY, 8 * 60) })).toThrow(/çalışma saat/);
    expect(() => book({ startsAt: istanbulDateTime(TUESDAY, 12 * 60) })).toThrow(/uygunluk/);
    expect(() => book({ startsAt: istanbulDateTime("2026-10-11", 9 * 60) })).toThrow(/çalışma saat/);
  });

  it("hizmet süresi ve ücretini randevuya kopyalar", () => {
    const appointment = book({ service: exam(80_000) });
    expect(appointment.getDurationMinutes()).toBe(20);
    expect(appointment.getFeeKurus()).toBe(80_000);
    expect(appointment.getServiceName()).toBe("Genel Muayene");
  });

  it("doktor laboratuvar hizmeti veremez, sağlık personeli muayene veremez", () => {
    const personnel = new HealthPersonnel("lab", "Merve Aksoy", "lab@test.com", "c1", ["s2", "s1"]);
    expect(doctor(["s1", "s2"]).provides(labService())).toBe(false);
    expect(personnel.provides(exam())).toBe(false);
    expect(personnel.provides(labService())).toBe(true);
    expect(() => doctor().assertCanOffer([labService()])).toThrow(/muayene/);
    expect(() => personnel.assertCanOffer([exam()])).toThrow(/tanı ve laboratuvar/);
  });

  it("yalnızca yetkili aktör onaylar, hasta iptal eder", () => {
    const appointment = book();
    const outsider = new Doctor("other", "Dr. Başka", "baska@test.com", "KBB", "c1", ["s1"]);
    const otherManager = new ClinicManager("m2", "Başka Yönetici", "b@test.com", "baska-kurum");
    const manager = new ClinicManager("m1", "Selin Arslan", "y@test.com", "h1");

    expect(() => appointment.approve(patient())).toThrow(/yetkiniz yok/);
    expect(() => appointment.approve(outsider)).toThrow(/yetkiniz yok/);
    expect(() => appointment.approve(otherManager)).toThrow(/yetkiniz yok/);

    appointment.approve(manager);
    expect(appointment.getStatus()).toBe("APPROVED");
    expect(() => appointment.approve(doctor())).toThrow(/onay bekleyen/);

    const pending = book();
    pending.reject(doctor());
    expect(pending.getStatus()).toBe("REJECTED");
    expect(() => pending.cancel(patient())).toThrow(/iptal edilemez/);

    const cancellable = book();
    cancellable.cancel(patient());
    expect(cancellable.getStatus()).toBe("CANCELLED");
    expect(cancellable.blocksTime()).toBe(false);
  });

  it("hastane yalnızca kendi şubesini kabul eder", () => {
    const hospital = new Hospital("h1", "Şehir Hastanesi", [], []);
    hospital.addBranch(clinic());
    expect(hospital.getBranches()).toHaveLength(1);
    const foreign = new Clinic("c9", "Başka Klinik", "baska", [], []);
    expect(() => hospital.addBranch(foreign)).toThrow(/hastaneye ait değil/);
  });

  it("açık saatleri hizmet süresine göre üretir", () => {
    const starts = new SchedulePolicy().listStartMinutes({
      dayOfWeek: 2,
      durationMinutes: 20,
      facilityId: "c1",
      staffId: "doc",
      workingHours: [hours()],
      availability: [slot("09:00", "10:00")],
      taken: [TimeRange.fromClock("09:00", "09:20")],
    });
    expect(starts).toEqual([9 * 60 + 20, 9 * 60 + 40]);
  });
});

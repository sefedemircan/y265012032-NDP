import { describe, expect, it } from "vitest";
import { Department } from "@/domain/organization/Department";
import { Hospital } from "@/domain/organization/Hospital";
import { MedicalService } from "@/domain/organization/MedicalService";
import { Doctor } from "@/domain/users/Doctor";
import { Patient } from "@/domain/users/Patient";
import type { ClinicStore } from "./ports";
import { ClinicService } from "./clinic-service";
import { ClinicSnapshot } from "./snapshot";

describe("hasta kurum seçenekleri", () => {
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
});

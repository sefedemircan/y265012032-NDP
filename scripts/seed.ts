import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Clinic } from "../src/domain/organization/Clinic";
import { Department } from "../src/domain/organization/Department";
import { MedicalService } from "../src/domain/organization/MedicalService";
import { WorkingHours } from "../src/domain/organization/WorkingHours";
import { Appointment } from "../src/domain/scheduling/Appointment";
import { AvailabilitySlot } from "../src/domain/scheduling/AvailabilitySlot";
import { formatIstanbulDate, istanbulDateTime, istanbulParts } from "../src/domain/scheduling/istanbulTime";
import { TimeRange } from "../src/domain/scheduling/TimeRange";
import { Doctor } from "../src/domain/users/Doctor";
import { Patient } from "../src/domain/users/Patient";
import { toAppointmentInsert } from "../src/infrastructure/mappers";

const PASSWORD = "Klinik123!";

function loadEnvFile(): void {
  const path = existsSync(resolve(process.cwd(), ".env.local"))
    ? resolve(process.cwd(), ".env.local")
    : resolve(import.meta.dirname, "..", ".env.local");
  if (!existsSync(path)) {
    throw new Error(".env.local bulunamadı.");
  }
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase adres ve servis anahtarı gerekli.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function ensureUser(admin: SupabaseClient, email: string, fullName: string): Promise<string> {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw error;
  const existing = data.users.find((user) => user.email === email);
  if (existing) return existing.id;
  const created = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (created.error || !created.data.user) throw created.error ?? new Error("Kullanıcı oluşturulamadı.");
  return created.data.user.id;
}

async function ensureFacility(
  admin: SupabaseClient,
  name: string,
  kind: "hospital" | "clinic",
  parentId: string | null,
): Promise<string> {
  const { data, error } = await admin.from("facilities").select("id").eq("name", name).maybeSingle();
  if (error) throw error;
  if (data?.id) return data.id as string;
  const id = crypto.randomUUID();
  const inserted = await admin.from("facilities").insert({ id, name, kind, parent_id: parentId });
  if (inserted.error) throw inserted.error;
  return id;
}

async function ensureDepartment(admin: SupabaseClient, facilityId: string, name: string): Promise<string> {
  const { data, error } = await admin
    .from("departments")
    .select("id")
    .eq("facility_id", facilityId)
    .eq("name", name)
    .maybeSingle();
  if (error) throw error;
  if (data?.id) return data.id as string;
  const id = crypto.randomUUID();
  const inserted = await admin.from("departments").insert({ id, facility_id: facilityId, name });
  if (inserted.error) throw inserted.error;
  return id;
}

async function ensureService(
  admin: SupabaseClient,
  departmentId: string,
  name: string,
  category: "examination" | "diagnostic" | "laboratory",
  durationMinutes: number,
  feeKurus: number,
): Promise<string> {
  const { data, error } = await admin
    .from("medical_services")
    .select("id")
    .eq("department_id", departmentId)
    .eq("name", name)
    .maybeSingle();
  if (error) throw error;
  if (data?.id) return data.id as string;
  const id = crypto.randomUUID();
  const inserted = await admin.from("medical_services").insert({
    id,
    department_id: departmentId,
    name,
    category,
    duration_minutes: durationMinutes,
    fee_kurus: feeKurus,
  });
  if (inserted.error) throw inserted.error;
  return id;
}

function nextWeekday(): string {
  let cursor = formatIstanbulDate(new Date());
  for (let offset = 0; offset < 8; offset += 1) {
    const noon = istanbulDateTime(cursor, 12 * 60);
    const shifted = new Date(noon.getTime() + 24 * 60 * 60 * 1000);
    cursor = formatIstanbulDate(shifted);
    const { dayOfWeek } = istanbulParts(istanbulDateTime(cursor, 12 * 60));
    if (dayOfWeek >= 1 && dayOfWeek <= 5) return cursor;
  }
  throw new Error("Uygun gün bulunamadı.");
}

async function main(): Promise<void> {
  loadEnvFile();
  const admin = adminClient();

  const managerId = await ensureUser(admin, "yonetici@ndp.test", "Selin Arslan");
  const doctorId = await ensureUser(admin, "doktor@ndp.test", "Dr. Emre Demir");
  const labId = await ensureUser(admin, "laborant@ndp.test", "Merve Aksoy");
  const radiologyId = await ensureUser(admin, "radyoloji@ndp.test", "Kerem Aydın");
  const serdivanDoctorId = await ensureUser(admin, "doktor.serdivan@ndp.test", "Dr. Ayşe Kaya");
  const patientId = await ensureUser(admin, "hasta@ndp.test", "Deniz Yılmaz");

  const hospitalId = await ensureFacility(admin, "Sakarya Şehir Hastanesi", "hospital", null);
  const merkezId = await ensureFacility(admin, "Merkez Şube", "clinic", hospitalId);
  const korucukId = await ensureFacility(admin, "Korucuk Şube", "clinic", hospitalId);
  const serdivanId = await ensureFacility(admin, "Serdivan Aile Sağlığı", "clinic", null);

  const profiles = [
    { id: managerId, full_name: "Selin Arslan", email: "yonetici@ndp.test", role: "clinic_manager", specialty: null, facility_id: hospitalId },
    { id: doctorId, full_name: "Dr. Emre Demir", email: "doktor@ndp.test", role: "doctor", specialty: "Dahiliye", facility_id: merkezId },
    { id: labId, full_name: "Merve Aksoy", email: "laborant@ndp.test", role: "health_personnel", specialty: null, facility_id: merkezId },
    { id: radiologyId, full_name: "Kerem Aydın", email: "radyoloji@ndp.test", role: "health_personnel", specialty: null, facility_id: merkezId },
    { id: serdivanDoctorId, full_name: "Dr. Ayşe Kaya", email: "doktor.serdivan@ndp.test", role: "doctor", specialty: "Aile Hekimliği", facility_id: serdivanId },
    { id: patientId, full_name: "Deniz Yılmaz", email: "hasta@ndp.test", role: "patient", specialty: null, facility_id: null },
  ];
  for (const profile of profiles) {
    const { error } = await admin.from("profiles").update(profile).eq("id", profile.id);
    if (error) throw error;
  }

  const merkezDahiliye = await ensureDepartment(admin, merkezId, "Dahiliye");
  const merkezRadyoloji = await ensureDepartment(admin, merkezId, "Radyoloji");
  const merkezLab = await ensureDepartment(admin, merkezId, "Laboratuvar");
  const korucukDahiliye = await ensureDepartment(admin, korucukId, "Dahiliye");
  const serdivanDahiliye = await ensureDepartment(admin, serdivanId, "Dahiliye");

  const muayeneId = await ensureService(admin, merkezDahiliye, "Genel Muayene", "examination", 20, 50_000);
  const goruntulemeId = await ensureService(admin, merkezRadyoloji, "Görüntüleme", "diagnostic", 30, 80_000);
  const tahlilId = await ensureService(admin, merkezLab, "Kan Tahlili", "laboratory", 15, 25_000);
  await ensureService(admin, korucukDahiliye, "Genel Muayene", "examination", 20, 50_000);
  const serdivanMuayeneId = await ensureService(admin, serdivanDahiliye, "Genel Muayene", "examination", 20, 40_000);

  const staffLinks = [
    { staff_id: doctorId, service_id: muayeneId },
    { staff_id: radiologyId, service_id: goruntulemeId },
    { staff_id: labId, service_id: tahlilId },
    { staff_id: serdivanDoctorId, service_id: serdivanMuayeneId },
  ];
  const staffIds = [doctorId, radiologyId, labId, serdivanDoctorId];
  const cleared = await admin.from("staff_services").delete().in("staff_id", staffIds);
  if (cleared.error) throw cleared.error;
  const linked = await admin.from("staff_services").insert(staffLinks);
  if (linked.error) throw linked.error;

  const clinicIds = [merkezId, korucukId, serdivanId];
  const removedHours = await admin.from("working_hours").delete().in("facility_id", clinicIds);
  if (removedHours.error) throw removedHours.error;
  const hourRows = clinicIds.flatMap((facilityId) =>
    [1, 2, 3, 4, 5].map((day) => ({
      facility_id: facilityId,
      day_of_week: day,
      start_minute: 9 * 60,
      end_minute: 17 * 60,
    })),
  );
  const hours = await admin.from("working_hours").insert(hourRows);
  if (hours.error) throw hours.error;

  const removedSlots = await admin.from("availability_slots").delete().in("staff_id", staffIds);
  if (removedSlots.error) throw removedSlots.error;
  const slotRows = [
    { staffId: doctorId, start: 9 * 60, end: 12 * 60 },
    { staffId: radiologyId, start: 10 * 60, end: 15 * 60 },
    { staffId: labId, start: 13 * 60, end: 16 * 60 },
    { staffId: serdivanDoctorId, start: 9 * 60, end: 13 * 60 },
  ].flatMap((slot) =>
    [1, 2, 3, 4, 5].map((day) => ({
      staff_id: slot.staffId,
      day_of_week: day,
      start_minute: slot.start,
      end_minute: slot.end,
    })),
  );
  const slots = await admin.from("availability_slots").insert(slotRows);
  if (slots.error) throw slots.error;

  const existing = await admin
    .from("appointments")
    .select("id")
    .eq("patient_id", patientId)
    .eq("staff_id", doctorId)
    .eq("status", "PENDING")
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (!existing.data) {
    const date = nextWeekday();
    const { dayOfWeek } = istanbulParts(istanbulDateTime(date, 9 * 60));
    const weekdayHours = [1, 2, 3, 4, 5].map(
      (day) => new WorkingHours(crypto.randomUUID(), merkezId, day, TimeRange.fromMinutes(9 * 60, 17 * 60)),
    );
    const appointment = Appointment.request({
      id: crypto.randomUUID(),
      patient: new Patient(patientId, "Deniz Yılmaz", "hasta@ndp.test"),
      staff: new Doctor(doctorId, "Dr. Emre Demir", "doktor@ndp.test", "Dahiliye", merkezId, [muayeneId]),
      service: new MedicalService(muayeneId, "Genel Muayene", "examination", 20, 50_000, merkezDahiliye, merkezId),
      facility: new Clinic(merkezId, "Merkez Şube", hospitalId, weekdayHours, [
        new Department(merkezDahiliye, "Dahiliye", merkezId),
      ]),
      startsAt: istanbulDateTime(date, 9 * 60),
      availability: [
        new AvailabilitySlot(crypto.randomUUID(), doctorId, dayOfWeek, TimeRange.fromMinutes(9 * 60, 12 * 60)),
      ],
      existing: [],
    });
    const inserted = await admin.from("appointments").insert(toAppointmentInsert(appointment));
    if (inserted.error) throw inserted.error;
  }

  console.log("Demo verisi hazır. Parola: Klinik123!");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

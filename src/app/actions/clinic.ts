"use server";

import { revalidatePath } from "next/cache";
import { parseLiraToKurus } from "@/domain/organization/money";
import type { ServiceCategory } from "@/domain/organization/MedicalService";
import { ClinicManager } from "@/domain/users/ClinicManager";
import { Patient } from "@/domain/users/Patient";
import { DomainError } from "@/domain/errors";
import { toActionError } from "@/application/guards";
import type { ActionResult, OpenSlot } from "@/application/views";
import { requireUser } from "@/infrastructure/session";
import { services } from "@/infrastructure/services";

const CATEGORIES: ServiceCategory[] = ["examination", "diagnostic", "laboratory"];

function isCategory(value: string): value is ServiceCategory {
  return CATEGORIES.includes(value as ServiceCategory);
}

export async function listOpenSlots(input: {
  facilityId: string;
  serviceId: string;
  staffId: string;
  date: string;
}): Promise<{ slots: OpenSlot[] } | { error: string }> {
  try {
    const user = await requireUser();
    if (!(user instanceof Patient)) return { error: "Saatleri hasta görüntüleyebilir." };
    const { clinic } = await services();
    return { slots: await clinic.openSlots(input) };
  } catch (error) {
    return { error: toActionError(error) };
  }
}

export async function bookAppointment(input: {
  facilityId: string;
  serviceId: string;
  staffId: string;
  date: string;
  startMinute: number;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!(user instanceof Patient)) return { error: "Randevuyu hasta alabilir." };
    const { clinic } = await services();
    await clinic.book(user, input);
    revalidatePath("/hasta");
    return { message: "Randevu talebi oluşturuldu. Onay bekliyor." };
  } catch (error) {
    return { error: toActionError(error) };
  }
}

export async function cancelAppointment(appointmentId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const { clinic } = await services();
    await clinic.cancel(user, appointmentId);
    revalidatePath("/hasta");
    return { message: "Randevu iptal edildi." };
  } catch (error) {
    return { error: toActionError(error) };
  }
}

export async function decideAppointment(appointmentId: string, decision: "approve" | "reject"): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const { clinic } = await services();
    if (decision === "approve") await clinic.approve(user, appointmentId);
    else await clinic.reject(user, appointmentId);
    revalidatePath("/personel");
    revalidatePath("/yonetici");
    return { message: decision === "approve" ? "Randevu onaylandı." : "Randevu reddedildi." };
  } catch (error) {
    return { error: toActionError(error) };
  }
}

export async function saveAvailability(input: {
  staffId: string;
  dayOfWeek: number;
  start: string;
  end: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const { clinic } = await services();
    await clinic.addSlot(user, input);
    revalidatePath("/personel");
    revalidatePath("/yonetici");
    return { message: "Uygunluk dilimi kaydedildi." };
  } catch (error) {
    return { error: toActionError(error) };
  }
}

export async function removeAvailability(slotId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const { clinic } = await services();
    await clinic.removeSlot(user, slotId);
    revalidatePath("/personel");
    revalidatePath("/yonetici");
    return { message: "Uygunluk dilimi silindi." };
  } catch (error) {
    return { error: toActionError(error) };
  }
}

export async function addBranch(name: string): Promise<ActionResult> {
  try {
    const manager = await requireManager();
    const { clinic } = await services();
    await clinic.addBranch(manager, name);
    revalidatePath("/yonetici");
    return { message: "Şube eklendi." };
  } catch (error) {
    return { error: toActionError(error) };
  }
}

export async function addDepartment(facilityId: string, name: string): Promise<ActionResult> {
  try {
    const manager = await requireManager();
    const { clinic } = await services();
    await clinic.addDepartment(manager, facilityId, name);
    revalidatePath("/yonetici");
    return { message: "Bölüm eklendi." };
  } catch (error) {
    return { error: toActionError(error) };
  }
}

export async function addService(input: {
  facilityId: string;
  departmentId: string;
  name: string;
  category: string;
  durationMinutes: number;
  feeLira: string;
}): Promise<ActionResult> {
  try {
    if (!isCategory(input.category)) throw new DomainError("Hizmet türü geçersiz.");
    const manager = await requireManager();
    const { clinic } = await services();
    await clinic.addService(manager, {
      facilityId: input.facilityId,
      departmentId: input.departmentId,
      name: input.name,
      category: input.category,
      durationMinutes: input.durationMinutes,
      feeKurus: parseLiraToKurus(input.feeLira),
    });
    revalidatePath("/yonetici");
    return { message: "Hizmet eklendi." };
  } catch (error) {
    return { error: toActionError(error) };
  }
}

export async function saveHours(
  facilityId: string,
  entries: { dayOfWeek: number; start: string; end: string }[],
): Promise<ActionResult> {
  try {
    const manager = await requireManager();
    const { clinic } = await services();
    await clinic.replaceHours(manager, facilityId, entries);
    revalidatePath("/yonetici");
    return { message: "Çalışma saatleri kaydedildi." };
  } catch (error) {
    return { error: toActionError(error) };
  }
}

export async function addStaff(input: {
  facilityId: string;
  role: "doctor" | "health_personnel";
  fullName: string;
  email: string;
  password: string;
  specialty: string;
  serviceIds: string[];
}): Promise<ActionResult> {
  try {
    const manager = await requireManager();
    const { accounts } = await services();
    await accounts.registerStaff(manager, input);
    revalidatePath("/yonetici");
    return { message: "Personel kaydedildi." };
  } catch (error) {
    return { error: toActionError(error) };
  }
}

async function requireManager(): Promise<ClinicManager> {
  const user = await requireUser();
  if (!(user instanceof ClinicManager)) throw new DomainError("Bu işlem için yönetici yetkisi gerekir.");
  return user;
}

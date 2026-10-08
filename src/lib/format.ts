import type { AppointmentStatus } from "@/domain/scheduling/ApprovalTarget";
import type { UserRole } from "@/domain/users/User";

export const ROLE_LABELS: Record<UserRole, string> = {
  patient: "Hasta",
  doctor: "Doktor",
  health_personnel: "Sağlık personeli",
  clinic_manager: "Yönetici",
};

export const CATEGORY_LABELS = {
  examination: "Muayene",
  diagnostic: "Tanı",
  laboratory: "Laboratuvar",
} as const;

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: "Onay bekliyor",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
  CANCELLED: "İptal edildi",
};

export const WEEKDAY_LABELS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function formatFeeKurus(feeKurus: number): string {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(feeKurus / 100);
}

export function formatAppointmentTime(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

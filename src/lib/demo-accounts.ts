import type { UserRole } from "@/domain/users/User";

export type DemoAccount = {
  email: string;
  fullName: string;
  role: UserRole;
  description: string;
};

/** Seed ile gelen demo hesaplar. Parola istemciye çıkmaz. */
export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    email: "hasta@ndp.test",
    fullName: "Deniz Yılmaz",
    role: "patient",
    description: "Hasta",
  },
  {
    email: "doktor@ndp.test",
    fullName: "Dr. Emre Demir",
    role: "doctor",
    description: "Doktor · Merkez Şube",
  },
  {
    email: "laborant@ndp.test",
    fullName: "Merve Aksoy",
    role: "health_personnel",
    description: "Laboratuvar personeli",
  },
  {
    email: "radyoloji@ndp.test",
    fullName: "Kerem Aydın",
    role: "health_personnel",
    description: "Radyoloji personeli",
  },
  {
    email: "doktor.serdivan@ndp.test",
    fullName: "Dr. Ayşe Kaya",
    role: "doctor",
    description: "Doktor · Serdivan klinik",
  },
  {
    email: "yonetici@ndp.test",
    fullName: "Selin Arslan",
    role: "clinic_manager",
    description: "Yönetici · Şehir Hastanesi",
  },
];

export function isDemoAccountEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return DEMO_ACCOUNTS.some((account) => account.email === normalized);
}

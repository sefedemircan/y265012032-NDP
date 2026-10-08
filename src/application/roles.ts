import type { UserRole } from "@/domain/users/User";

export function homeForRole(role: UserRole): string {
  switch (role) {
    case "patient":
      return "/hasta";
    case "doctor":
    case "health_personnel":
      return "/personel";
    case "clinic_manager":
      return "/yonetici";
  }
}

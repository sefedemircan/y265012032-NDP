import { redirect } from "next/navigation";
import { homeForRole } from "@/application/roles";
import { Patient } from "@/domain/users/Patient";
import { requireUser } from "@/infrastructure/session";

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!(user instanceof Patient)) redirect(homeForRole(user.getRole()));
  return children;
}

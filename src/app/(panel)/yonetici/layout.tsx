import { redirect } from "next/navigation";
import { homeForRole } from "@/application/roles";
import { ClinicManager } from "@/domain/users/ClinicManager";
import { requireUser } from "@/infrastructure/session";

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!(user instanceof ClinicManager)) redirect(homeForRole(user.getRole()));
  return children;
}

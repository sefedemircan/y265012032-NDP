import { redirect } from "next/navigation";
import { homeForRole } from "@/application/roles";
import { Staff } from "@/domain/users/Staff";
import { requireUser } from "@/infrastructure/session";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!(user instanceof Staff)) redirect(homeForRole(user.getRole()));
  return children;
}

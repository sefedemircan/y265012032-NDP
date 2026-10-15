import { StaffPanel } from "@/components/staff-panel";
import { Staff } from "@/domain/users/Staff";
import { requireUser } from "@/infrastructure/session";
import { services } from "@/infrastructure/services";

export default async function StaffPage() {
  const user = await requireUser();
  if (!(user instanceof Staff)) return null;
  const { clinic } = await services();
  const data = await clinic.staffDashboard(user);
  return <StaffPanel staffId={user.getId()} data={data} />;
}

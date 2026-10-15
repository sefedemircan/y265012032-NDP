import { ManagerPanel } from "@/components/manager-panel";
import { ClinicManager } from "@/domain/users/ClinicManager";
import { requireUser } from "@/infrastructure/session";
import { services } from "@/infrastructure/services";

export default async function ManagerPage() {
  const user = await requireUser();
  if (!(user instanceof ClinicManager)) return null;
  const { clinic } = await services();
  const data = await clinic.managerDashboard(user);
  return <ManagerPanel data={data} />;
}

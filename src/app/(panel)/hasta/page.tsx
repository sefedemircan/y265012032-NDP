import { PatientPanel } from "@/components/patient-panel";
import { Patient } from "@/domain/users/Patient";
import { requireUser } from "@/infrastructure/session";
import { services } from "@/infrastructure/services";

export default async function PatientPage() {
  const user = await requireUser();
  if (!(user instanceof Patient)) return null;
  const { clinic } = await services();
  const data = await clinic.patientDashboard(user);
  return <PatientPanel data={data} />;
}

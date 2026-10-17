import { Anchor } from "@mantine/core";
import { PatientRegisterForm } from "@/components/auth-forms";
import { AuthPageShell } from "@/components/auth-page-shell";

export default function RegisterPage() {
  return (
    <AuthPageShell
      eyebrow="HASTA KAYDI"
      title="Hesabınızı oluşturun"
      description="Uygun sağlık hizmetlerini görüntülemek ve randevu almak için bilgilerinizi girin."
      footer={
        <>
          Zaten hesabınız var mı? <Anchor href="/giris">Giriş yapın</Anchor>
        </>
      }
    >
      <PatientRegisterForm />
    </AuthPageShell>
  );
}

import { Anchor } from "@mantine/core";
import { ManagerRegisterForm } from "@/components/auth-forms";
import { AuthPageShell } from "@/components/auth-page-shell";

export default function ManagerRegisterPage() {
  return (
    <AuthPageShell
      eyebrow="KURUM YÖNETİMİ"
      title="Kurum hesabı oluşturun"
      description="Hastanenizi veya kliniğinizi tanımlayın, ekibinizi ve randevu süreçlerinizi yönetin."
      footer={
        <>
          Zaten bir kurum hesabınız var mı? <Anchor href="/giris">Giriş yapın</Anchor>
        </>
      }
    >
      <ManagerRegisterForm />
    </AuthPageShell>
  );
}

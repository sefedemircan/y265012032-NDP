import { Anchor } from "@mantine/core";
import { LoginForm } from "@/components/auth-forms";
import { AuthPageShell } from "@/components/auth-page-shell";

export default function LoginPage() {
  return (
    <AuthPageShell
      eyebrow="TEKRAR HOŞ GELDİNİZ"
      title="Hesabınıza giriş yapın"
      description="Demo hesabı seçip şifresiz giriş yapın."
      footer={
        <>
          Hesabınız yok mu? <Anchor href="/kayit">Hasta kaydı</Anchor>
          <span className="footerSeparator">·</span>
          <Anchor href="/yonetici-kayit">Yönetici kaydı</Anchor>
        </>
      }
    >
      <LoginForm />
    </AuthPageShell>
  );
}

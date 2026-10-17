import { Alert, Button, Container, Group, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import Link from "next/link";
import { redirect } from "next/navigation";
import { homeForRole } from "@/application/roles";
import type { UserRole } from "@/domain/users/User";
import { publicEnv } from "@/infrastructure/supabase/env";
import { createClient } from "@/infrastructure/supabase/server";

const FEATURES = [
  {
    number: "01",
    title: "Hasta",
    description: "Uygun hekim ve saati görüntüleyin, birkaç adımda randevu talebi oluşturun.",
  },
  {
    number: "02",
    title: "Sağlık personeli",
    description: "Çalışma takviminizi yönetin, bekleyen randevuları kolayca sonuçlandırın.",
  },
  {
    number: "03",
    title: "Kurum yöneticisi",
    description: "Şube, bölüm, hizmet ve personel süreçlerini tek ekrandan takip edin.",
  },
];

export default async function HomePage() {
  const env = publicEnv();
  if (env) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (data?.role) redirect(homeForRole(data.role as UserRole));
    }
  }

  return (
    <main className="publicPage landingPage">
      <div className="publicGlow publicGlowOne" />
      <div className="publicGlow publicGlowTwo" />
      <Container size="lg" className="landingContainer">
        <header className="landingHeader">
          <Link href="/" className="brandLink" aria-label="KlinikDefter ana sayfa">
            <span className="brandMark">+</span>
            <span>KlinikDefter</span>
          </Link>
          <Button component="a" href="/giris" variant="default" radius="xl">
            Giriş yap
          </Button>
        </header>

        {env ? null : (
          <Alert color="yellow" title="Supabase bağlantısı eksik" mb="xl">
            `.env.local` içine gerekli Supabase anahtarlarını ekleyin. Şema `supabase/migrations` altındadır.
          </Alert>
        )}

        <section className="heroGrid">
          <Stack gap="lg" className="heroCopy">
            <Text className="eyebrow">SADE, HIZLI VE GÜVENLİ</Text>
            <Title order={1} className="heroTitle">
              Sağlık randevularını tek yerde yönetin.
            </Title>
            <Text className="heroDescription">
              Klinikler, hastaneler, sağlık personeli ve hastalar için düzenli bir randevu deneyimi.
              Karmaşık süreçler yerine ihtiyacınız olan her şey tek ekranda.
            </Text>
            <Group gap="sm">
              <Button component="a" href="/giris" size="md" radius="xl" className="primaryAction">
                Randevulara giriş yap
              </Button>
              <Button component="a" href="/kayit" size="md" radius="xl" variant="subtle" color="dark">
                Hasta hesabı oluştur
              </Button>
            </Group>
          </Stack>

          <Paper className="accessCard" radius="xl">
            <Stack gap="lg">
              <div>
                <Text className="cardKicker">HIZLI BAŞLANGIÇ</Text>
                <Title order={2} className="accessTitle">
                  Nasıl devam etmek istersiniz?
                </Title>
                <Text c="dimmed" mt={6}>
                  Hesap türünüze uygun seçeneği kullanın.
                </Text>
              </div>
              <Button component="a" href="/giris" size="lg" fullWidth radius="md" className="primaryAction">
                Mevcut hesabımla giriş yap
              </Button>
              <div className="choiceDivider">
                <span>veya yeni hesap</span>
              </div>
              <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
                <Button component="a" href="/kayit" variant="light" color="teal" size="md" radius="md">
                  Hasta kaydı
                </Button>
                <Button component="a" href="/yonetici-kayit" variant="default" size="md" radius="md">
                  Yönetici kaydı
                </Button>
              </SimpleGrid>
            </Stack>
          </Paper>
        </section>

        <section className="featureSection">
          <Text className="eyebrow" ta="center">
            HER ROL İÇİN TEK SİSTEM
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" mt="md">
            {FEATURES.map((feature) => (
              <Paper key={feature.number} className="featureCard" radius="lg">
                <Text className="featureNumber">{feature.number}</Text>
                <Title order={3} mt="md">
                  {feature.title}
                </Title>
                <Text c="dimmed" mt="xs" lh={1.65}>
                  {feature.description}
                </Text>
              </Paper>
            ))}
          </SimpleGrid>
        </section>

        <footer className="publicFooter">
          <Text size="sm" c="dimmed">
            KlinikDefter · Hastane ve klinik randevu yönetimi
          </Text>
        </footer>
      </Container>
    </main>
  );
}

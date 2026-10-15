import { Container } from "@mantine/core";
import { Shell } from "@/components/shell";
import { requireUser } from "@/infrastructure/session";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <Shell user={{ fullName: user.getFullName(), role: user.getRole() }}>
      <Container size="lg" py="md">
        {children}
      </Container>
    </Shell>
  );
}

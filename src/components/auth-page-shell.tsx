import type { ReactNode } from "react";
import { Container, Paper, Stack, Text, Title } from "@mantine/core";
import Link from "next/link";

type AuthPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthPageShell({ eyebrow, title, description, children, footer }: AuthPageShellProps) {
  return (
    <main className="publicPage authPage">
      <div className="publicGlow publicGlowOne" />
      <div className="publicGlow publicGlowTwo" />
      <Container size={460} className="authContainer">
        <Link href="/" className="backLink">
          <span aria-hidden="true">←</span> Ana sayfaya dön
        </Link>
        <Link href="/" className="brandLink authBrand" aria-label="NDP ana sayfa">
          <span className="brandMark">+</span>
          <span>NDP</span>
        </Link>
        <Paper className="authCard" radius="xl">
          <Stack gap="xl">
            <div>
              <Text className="cardKicker">{eyebrow}</Text>
              <Title order={1} className="authTitle">
                {title}
              </Title>
              <Text c="dimmed" mt="xs" lh={1.6}>
                {description}
              </Text>
            </div>
            {children}
          </Stack>
        </Paper>
        <Text ta="center" size="sm" c="dimmed" className="authFooter">
          {footer}
        </Text>
      </Container>
    </main>
  );
}

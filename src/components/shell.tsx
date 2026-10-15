"use client";

import { Anchor, AppShell, Badge, Button, Group, Text } from "@mantine/core";
import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import type { SessionUser } from "@/application/views";
import { homeForRole } from "@/application/roles";
import { ROLE_LABELS } from "@/lib/format";

export function Shell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return (
    <AppShell header={{ height: 64 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Anchor component={Link} href={homeForRole(user.role)} underline="never" c="teal.8">
            <Text fw={700}>KlinikDefter</Text>
          </Anchor>
          <Group>
            <Text size="sm">{user.fullName}</Text>
            <Badge variant="light">{ROLE_LABELS[user.role]}</Badge>
            <Button variant="subtle" color="gray" onClick={() => signOut()}>
              Çıkış
            </Button>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Main style={{ background: "#f3f6f5", minHeight: "100vh" }}>{children}</AppShell.Main>
    </AppShell>
  );
}

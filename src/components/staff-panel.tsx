"use client";

import { Button, Group, Paper, Select, SimpleGrid, Stack, TextInput, Title } from "@mantine/core";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { removeAvailability, saveAvailability } from "@/app/actions/clinic";
import type { StaffDashboard } from "@/application/views";
import { formatMinutes, WEEKDAY_LABELS } from "@/lib/format";
import { AppointmentList } from "./appointment-list";
import { toast } from "./toast";

export function StaffPanel({ staffId, data }: { staffId: string; data: StaffDashboard }) {
  const router = useRouter();
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("12:00");
  const [saving, setSaving] = useState(false);

  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <Paper withBorder p="lg" radius="md" bg="white">
          <Stack>
            <Title order={3}>Uygunluk dilimi</Title>
            <Select
              label="Gün"
              value={dayOfWeek}
              onChange={(value) => setDayOfWeek(value ?? "1")}
              data={WEEKDAY_LABELS.map((label, index) => ({ value: String(index), label }))}
            />
            <TextInput label="Başlangıç" value={start} onChange={(event) => setStart(event.currentTarget.value)} />
            <TextInput label="Bitiş" value={end} onChange={(event) => setEnd(event.currentTarget.value)} />
            <Button
              loading={saving}
              onClick={async () => {
                setSaving(true);
                const result = await saveAvailability({
                  staffId,
                  dayOfWeek: Number(dayOfWeek),
                  start,
                  end,
                });
                toast(result);
                setSaving(false);
                if (!result.error) router.refresh();
              }}
            >
              Dilimi kaydet
            </Button>
          </Stack>
        </Paper>
        <Paper withBorder p="lg" radius="md" bg="white">
          <Stack>
            <Title order={3}>Tanımlı dilimler</Title>
            {data.slots.length === 0 ? <Title order={5} c="dimmed">Henüz dilim yok.</Title> : null}
            {data.slots.map((slot) => (
              <Group key={slot.id} justify="space-between">
                <span>
                  {WEEKDAY_LABELS[slot.dayOfWeek]} {formatMinutes(slot.startMinute)}–{formatMinutes(slot.endMinute)}
                </span>
                <Button
                  size="xs"
                  variant="subtle"
                  color="red"
                  onClick={async () => {
                    const result = await removeAvailability(slot.id);
                    toast(result);
                    if (!result.error) router.refresh();
                  }}
                >
                  Sil
                </Button>
              </Group>
            ))}
          </Stack>
        </Paper>
      </SimpleGrid>
      <Paper withBorder p="lg" radius="md" bg="white">
        <Stack>
          <Title order={3}>Randevularım</Title>
          <AppointmentList rows={data.appointments} showPatient allowDecision />
        </Stack>
      </Paper>
    </Stack>
  );
}
